// Security cameras: wall-mounted heads that sweep their cone back and forth.
// They cannot move, but their cones cover the open floor a guard never walks.

import { CAMERA } from './config.js'
import { hasLineOfSight } from './world.js'

export function makeCamera(spawn, def, index) {
  return {
    x: spawn.x,
    y: spawn.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    // Each camera starts at a different point of its sweep so the room's
    // cones never march in lockstep.
    phase: index * 1.7,
    angle: def.baseAngle,
    seenFlash: 0,
  }
}

export function updateCamera(camera, time) {
  camera.angle = camera.baseAngle + Math.sin(time * CAMERA.sweepSpeed + camera.phase) * camera.sweep
}

export function cameraSees(camera, thief, world, sneaking) {
  const dx = thief.x - camera.x
  const dy = thief.y - camera.y
  const dist = Math.hypot(dx, dy)
  const range = CAMERA.sightRange * (sneaking ? 0.58 : 1)
  if (dist > range) return false
  let diff = Math.atan2(dy, dx) - camera.angle
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  if (Math.abs(diff) > CAMERA.halfAngle) return false
  return hasLineOfSight(world, camera.x, camera.y, thief.x, thief.y)
}
