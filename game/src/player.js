// The thief: WASD/arrows to move, Shift to sneak, E to lift loot, click to
// throw a coin. A thrown coin arcs to its tile and rings there; nearby guards
// leave their patrol to look at it — the thief's only tool, and it costs one
// of a few coins.

import { TILE, PLAYER, COIN } from './config.js'
import { moveCircle, tileAt } from './world.js'

export function makeThief(start) {
  return {
    x: start.x,
    y: start.y,
    facing: 0,
    sneaking: false,
    moving: false,
    coins: COIN.startCount,
    // Coins in flight or lying on the floor: {x, y, tx, ty, fromX, fromY, t, landed}
    thrown: [],
  }
}

export function updateThief(thief, dt, world, keys) {
  let ix = 0
  let iy = 0
  if (keys.has('arrowup') || keys.has('w')) iy -= 1
  if (keys.has('arrowdown') || keys.has('s')) iy += 1
  if (keys.has('arrowleft') || keys.has('a')) ix -= 1
  if (keys.has('arrowright') || keys.has('d')) ix += 1

  thief.sneaking = keys.has('shift')
  thief.moving = ix !== 0 || iy !== 0
  if (thief.moving) {
    const len = Math.hypot(ix, iy)
    const speed = thief.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed
    moveCircle(world, thief, (ix / len) * speed * dt, (iy / len) * speed * dt, PLAYER.radius)
    thief.facing = Math.atan2(iy, ix)
  }

  for (const coin of thief.thrown) {
    if (!coin.landed) {
      coin.t += dt / COIN.flightTime
      if (coin.t >= 1) {
        coin.landed = true
        coin.t = 1
        coin.linger = COIN.lingerTime
      }
    } else {
      coin.linger -= dt
    }
  }
  thief.thrown = thief.thrown.filter((c) => !c.landed || c.linger > 0)
}

export function coinPosition(coin) {
  if (coin.landed) return { x: coin.x, y: coin.y }
  const t = coin.t
  const x = coin.fromX + (coin.x - coin.fromX) * t
  const y = coin.fromY + (coin.y - coin.fromY) * t
  // A little arc so the throw reads as a throw.
  return { x, y: y - Math.sin(t * Math.PI) * 26 }
}

export function throwCoin(thief, world, px, py) {
  if (thief.coins <= 0) return false
  const tx = Math.floor(px / TILE)
  const ty = Math.floor(py / TILE)
  const tile = tileAt(world, px, py)
  if (tile === '#' || tile === 'C') return false
  thief.coins -= 1
  thief.thrown.push({
    fromX: thief.x,
    fromY: thief.y,
    x: tx * TILE + TILE / 2,
    y: ty * TILE + TILE / 2,
    t: 0,
    landed: false,
    linger: COIN.lingerTime,
  })
  return true
}

// The nearest loot the thief stands close enough to lift, if any.
export function lootInReach(thief, loot) {
  for (const item of loot) {
    if (item.taken) continue
    if (Math.hypot(item.x - thief.x, item.y - thief.y) < TILE * 1.1) return item
  }
  return null
}

export function thiefOnExit(thief, exit) {
  return Math.hypot(exit.x - thief.x, exit.y - thief.y) < TILE * 0.9
}
