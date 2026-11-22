// Guards: they walk a patrol loop, scan at each waypoint, chase what they see
// and investigate thrown coins. A guard's vision cone is the game's central
// tension — the thief must read it before moving.

import { TILE, GUARD } from './config.js'
import { hasLineOfSight, moveCircle } from './world.js'

export function makeGuard(spawn, waypoints) {
  return {
    x: spawn.x,
    y: spawn.y,
    // Waypoints in pixels, looped.
    path: waypoints.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
    leg: 0,
    // Facing angle; starts looking down the first leg.
    angle: 0,
    state: 'patrol',
    pause: 0,
    loseTimer: 0,
    investigateTimer: 0,
    target: null,
    lastSeen: null,
    // How far this guard can currently see (sneaking shrinks it).
    seenFlash: 0,
  }
}

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

function turnToward(guard, wanted, rate, dt) {
  let diff = wanted - guard.angle
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff))
  guard.angle += step
  return Math.abs(diff) < 0.05
}

// Does this guard see the thief right now? Inside the cone, in range, with a
// clear line of sight — and closer when the thief sneaks.
export function guardSees(guard, thief, world, sneaking) {
  const dx = thief.x - guard.x
  const dy = thief.y - guard.y
  const dist = Math.hypot(dx, dy)
  const range = GUARD.sightRange * (sneaking ? 0.58 : 1)
  if (dist > range) return false
  let diff = Math.atan2(dy, dx) - guard.angle
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  if (Math.abs(diff) > GUARD.halfAngle) return false
  return hasLineOfSight(world, guard.x, guard.y, thief.x, thief.y)
}

export function updateGuard(guard, dt, world, thief, sneaking, alarmHigh) {
  guard.seenFlash = Math.max(0, guard.seenFlash - dt)
  const sees = guardSees(guard, thief, world, sneaking)

  if (sees) {
    guard.lastSeen = { x: thief.x, y: thief.y }
    guard.loseTimer = GUARD.loseSightAfter
    guard.seenFlash = 0.25
    if (guard.state !== 'chase') guard.state = 'chase'
  }

  if (guard.state === 'chase') {
    if (sees) {
      turnToward(guard, angleTo(guard, thief), 5.5, dt)
      stepToward(guard, thief, GUARD.chaseSpeed, dt, world)
      guard.loseTimer = GUARD.loseSightAfter
    } else {
      guard.loseTimer -= dt
      if (guard.lastSeen) {
        turnToward(guard, angleTo(guard, guard.lastSeen), 5.5, dt)
        stepToward(guard, guard.lastSeen, GUARD.chaseSpeed, dt, world)
        if (Math.hypot(guard.lastSeen.x - guard.x, guard.lastSeen.y - guard.y) < 14) guard.lastSeen = null
      }
      if (guard.loseTimer <= 0) {
        guard.state = 'patrol'
        guard.lastSeen = null
      }
    }
    return sees
  }

  if (guard.state === 'investigate' && guard.target) {
    turnToward(guard, angleTo(guard, guard.target), 4, dt)
    const arrived = stepToward(guard, guard.target, GUARD.investigateSpeed, dt, world)
    if (arrived) {
      guard.investigateTimer -= dt
      // Scan around while studying the spot.
      guard.angle += dt * 1.8
      if (guard.investigateTimer <= 0) {
        guard.state = 'patrol'
        guard.target = null
      }
    }
    return sees
  }

  // Patrol: walk the loop, pausing at each waypoint to look around.
  if (guard.pause > 0) {
    guard.pause -= dt
    guard.angle += dt * 0.9
    if (guard.pause <= 0) guard.leg = (guard.leg + 1) % guard.path.length
    return sees
  }
  const goal = guard.path[guard.leg]
  turnToward(guard, angleTo(guard, goal), 3.5, dt)
  const arrived = stepToward(guard, goal, alarmHigh ? GUARD.patrolSpeed * 1.35 : GUARD.patrolSpeed, dt, world)
  if (arrived) guard.pause = 0.9
  return sees
}

// Walk toward a point; returns true when close enough to count as arrived.
function stepToward(guard, goal, speed, dt, world) {
  const dx = goal.x - guard.x
  const dy = goal.y - guard.y
  const dist = Math.hypot(dx, dy)
  if (dist < 6) return true
  const step = Math.min(dist, speed * dt)
  moveCircle(world, guard, (dx / dist) * step, (dy / dist) * step, GUARD.radius)
  return false
}

export function sendToInvestigate(guard, point) {
  if (guard.state === 'chase') return
  guard.state = 'investigate'
  guard.target = { x: point.x, y: point.y }
  guard.investigateTimer = GUARD.investigateTime
}

export function guardCaughtThief(guard, thief) {
  return Math.hypot(guard.x - thief.x, guard.y - thief.y) < GUARD.catchDistance
}
