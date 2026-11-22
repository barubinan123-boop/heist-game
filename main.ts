// Midnight at the Meridian Vault — make.fun entry hand-in.
//
// A Node 22 program (standard library only) that hands the game in: it copies
// this repository's game/ and screenshots/ into the output directory and writes
// /output/dossier.json with the vendored make.fun library, so the sealed scorer
// can check the game and the judge can read it. Run it as:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output. The program is
// deterministic: two runs on the same repository write the same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDossier } from './vendor/makefun-game.ts'

const here = fileURLToPath(new URL('.', import.meta.url))
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output'

// Start from a clean output directory so a stale file from an earlier run can
// never leak into the entry.
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const copyDir = (name) => {
  const from = join(here, name)
  if (!existsSync(from)) {
    throw new Error(`main.ts: expected ${name}/ beside this file at ${from}, but it is missing`)
  }
  cpSync(from, join(out, name), { recursive: true })
}

copyDir('game')
copyDir('screenshots')

// The scorer's own caps: only text_max_bytes shapes the dossier bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or
// one over 256 KiB; more than 993 files in game/ or 48 MiB of game files in
// all, or a path under game/ over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
})
writeFileSync(join(out, 'dossier.json'), dossier)

console.log(`wrote ${out}/dossier.json (${dossier.length} bytes)`)
