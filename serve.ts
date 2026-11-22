// A tiny static file server for local play-testing of game/ (Node 22, standard
// library only). Development convenience, not a production server:
//
//   node serve.ts [--port 8080]
//
// Then open http://localhost:8080 in a desktop browser. It serves only files
// under game/, sends the MIME types a browser game needs, and refuses any path
// that escapes the game directory.

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)))
const args = process.argv.slice(2)
const portFlag = args.indexOf('--port')
const wanted = portFlag === -1 ? 8080 : Number(args[portFlag + 1])
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

createServer((request, response) => {
  const raw = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  const file = resolve(join(root, normalize(raw).replace(/^(\.\.[/\\])+/, '')))
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403)
    response.end('forbidden')
    return
  }
  const target = file === root || file.endsWith(sep) ? join(file, 'index.html') : file
  try {
    if (!statSync(target).isFile()) throw new Error('not a file')
  } catch {
    response.writeHead(404)
    response.end('not found')
    return
  }
  response.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' })
  createReadStream(target).pipe(response)
}).listen(port, () => console.log(`serving game/ at http://localhost:${port}`))
