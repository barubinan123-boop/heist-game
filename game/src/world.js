// The room itself: parsing a level map into walls, cover, loot, lasers and
// spawns, plus the two questions the rest of the game keeps asking it — can a
// circle stand here, and can one point see another?

import { TILE } from './config.js'
import { LOOT_KIND } from './levels.js'

const SOLID = new Set(['#', 'C'])
const WALKABLE = new Set(['.', 'P', 'E', 'L', 'V', 'D', 'G', 'K', '|', '-'])

export function parseLevel(def) {
  const rows = def.map.length
  const cols = def.map[0].length
  const at = (tx, ty) => def.map[ty][tx]
  const grid = def.map.map((row) => [...row])

  const loot = []
  const lasers = []
  let playerStart = null
  let exit = null
  const guardSpawns = []
  const cameraSpawns = []

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x]
      if (ch === 'P') playerStart = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }
      if (ch === 'E') exit = { tx: x, ty: y, x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }
      if (LOOT_KIND[ch]) loot.push({ kind: LOOT_KIND[ch], tx: x, ty: y, x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false })
      if (ch === 'G') guardSpawns.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 })
      if (ch === 'K') cameraSpawns.push({ tx: x, ty: y, x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 })
    }
  }

  // Group contiguous laser tiles into beams. A vertical beam is a run of '|'
  // in one column; a horizontal beam is a run of '-' in one row. Each beam
  // blinks on its own phase so the thief must time the crossing.
  const seenBeam = new Set()
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x]
      if (ch === '|' && !seenBeam.has(`${x},${y}`)) {
        const tiles = []
        for (let yy = y; yy < rows && grid[yy][x] === '|'; yy++) { tiles.push({ tx: x, ty: yy }); seenBeam.add(`${x},${yy}`) }
        lasers.push({ axis: 'v', tiles, phase: lasers.length * 0.45 })
      }
      if (ch === '-' && !seenBeam.has(`${x},${y}`)) {
        const tiles = []
        for (let xx = x; xx < cols && grid[y][xx] === '-'; xx++) { tiles.push({ tx: xx, ty: y }); seenBeam.add(`${xx},${y}`) }
        lasers.push({ axis: 'h', tiles, phase: lasers.length * 0.45 })
      }
    }
  }

  return { def, cols, rows, grid, loot, lasers, playerStart, exit, guardSpawns, cameraSpawns }
}

export function tileAt(world, px, py) {
  const tx = Math.floor(px / TILE)
  const ty = Math.floor(py / TILE)
  if (tx < 0 || ty < 0 || tx >= world.cols || ty >= world.rows) return '#'
  return world.grid[ty][tx]
}

export function isSolid(world, px, py) {
  return SOLID.has(tileAt(world, px, py))
}

// Can a circle of radius r stand at (px, py)? Sample the circle's edge so it
// slides along walls instead of snagging on corners.
export function canStand(world, px, py, r) {
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    if (isSolid(world, px + Math.cos(a) * r, py + Math.sin(a) * r)) return false
  }
  return true
}

// Move a circle by (dx, dy), sliding along one axis at a time.
export function moveCircle(world, pos, dx, dy, r) {
  if (dx !== 0 && canStand(world, pos.x + dx, pos.y, r)) pos.x += dx
  if (dy !== 0 && canStand(world, pos.x, pos.y + dy, r)) pos.y += dy
}

// Line of sight between two points: step along the segment and stop at the
// first solid tile. Walls and crates block sight; everything else does not.
export function hasLineOfSight(world, x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const dist = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(dist / (TILE / 3)))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (isSolid(world, x0 + dx * t, y0 + dy * t)) return false
  }
  return true
}

// Is the tile under (px, py) a laser beam that is on right now?
export function laserAt(world, px, py, time) {
  const tx = Math.floor(px / TILE)
  const ty = Math.floor(py / TILE)
  for (const beam of world.lasers) {
    if (!beam.tiles.some((t) => t.tx === tx && t.ty === ty)) continue
    return beamOn(beam, time)
  }
  return false
}

export function beamOn(beam, time) {
  const cycle = 1.25 + 0.85
  return ((time + beam.phase) % cycle) < 1.25
}

export function isWalkableTile(ch) {
  return WALKABLE.has(ch)
}
