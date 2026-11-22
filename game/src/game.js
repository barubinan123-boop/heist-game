// The heist itself: one state object, a fixed-step update, and the rules that
// turn seeing into alarm, alarm into busted, loot into a getaway.

import { ALARM, COIN, LOOT_VALUE } from './config.js'
import { LEVELS } from './levels.js'
import { parseLevel, laserAt } from './world.js'
import { makeGuard, updateGuard, guardSees, guardCaughtThief, sendToInvestigate } from './guards.js'
import { makeCamera, updateCamera, cameraSees } from './cameras.js'
import { makeThief, updateThief, throwCoin, lootInReach, thiefOnExit } from './player.js'
import { sfx } from './audio.js'

export function newGame() {
  return {
    screen: 'title',
    levelIndex: 0,
    levelName: LEVELS[0].name,
    levelBrief: LEVELS[0].brief,
    world: null,
    thief: null,
    guards: [],
    cameras: [],
    particles: [],
    keys: new Set(),
    alarm: 0,
    peakAlarm: 0,
    runPeakAlarm: 0,
    elapsed: 0,
    time: 0,
    seenNow: false,
    spottedCount: 0,
    levelSpotted: 0,
    wasSeen: false,
    bustedReason: '',
    runValue: 0,
    totalValue: 0,
    totalTime: 0,
    lastClear: null,
    finalStats: null,
    stepSoundTimer: 0,
    alarmTickTimer: 0,
  }
}

export function loadLevel(state, index) {
  const def = LEVELS[index]
  const world = parseLevel(def)
  state.levelIndex = index
  state.levelName = def.name
  state.levelBrief = def.brief
  state.world = world
  state.thief = makeThief(world.playerStart)
  state.guards = world.guardSpawns.map((spawn, i) => makeGuard(spawn, def.guards[i].waypoints))
  state.cameras = world.cameraSpawns.map((spawn, i) => makeCamera(spawn, def.cameras[i], i))
  state.particles = []
  state.alarm = 0
  state.peakAlarm = 0
  state.levelSpotted = 0
  state.elapsed = 0
  state.seenNow = false
  state.wasSeen = false
  state.screen = 'playing'
}

export function lootTaken(state) {
  return state.world.loot.filter((l) => l.taken).length
}

export function lootTotal(state) {
  return state.world.loot.length
}

function burst(state, x, y, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const speed = 30 + Math.random() * 70
    state.particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.6 + Math.random() * 0.4,
      max: 1,
      size: 2 + Math.random() * 3,
      color,
    })
  }
}

export function update(state, dt) {
  if (state.screen !== 'playing') return
  state.time += dt
  state.elapsed += dt

  const thief = state.thief
  updateThief(thief, dt, state.world, state.keys)

  // Footstep ticks, quieter while sneaking.
  if (thief.moving) {
    state.stepSoundTimer -= dt
    if (state.stepSoundTimer <= 0) {
      if (!thief.sneaking) sfx.step()
      state.stepSoundTimer = thief.sneaking ? 0.55 : 0.34
    }
  }

  // A landed coin draws nearby guards away from their patrol.
  for (const coin of thief.thrown) {
    if (!coin.landed || coin.called) continue
    coin.called = true
    sfx.coin()
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - coin.x, guard.y - coin.y) < COIN.hearRadius) {
        sendToInvestigate(guard, coin)
      }
    }
  }

  for (const cam of state.cameras) updateCamera(cam, state.time)

  // Who sees the thief, and how fast does the alarm climb?
  let seen = false
  let rise = 0
  const alarmHigh = state.alarm >= ALARM.suspiciousAt
  for (const guard of state.guards) {
    const sees = updateGuard(guard, dt, state.world, thief, thief.sneaking, alarmHigh)
    if (sees) { seen = true; rise += ALARM.guardRate }
    if (guardCaughtThief(guard, thief)) return bust(state, 'A guard grabbed you in the open.')
  }
  for (const cam of state.cameras) {
    const sees = cameraSees(cam, thief, state.world, thief.sneaking)
    cam.seenFlash = sees ? 0.25 : Math.max(0, cam.seenFlash - dt)
    if (sees) { seen = true; rise += ALARM.cameraRate }
  }
  if (laserAt(state.world, thief.x, thief.y, state.time)) {
    rise += ALARM.laserRate
    seen = true
  }

  if (seen && !state.wasSeen) {
    state.spottedCount += 1
    state.levelSpotted += 1
    sfx.spotted()
  }
  state.wasSeen = seen
  state.seenNow = seen

  if (seen) state.alarm = Math.min(ALARM.max, state.alarm + rise * dt)
  else state.alarm = Math.max(0, state.alarm - ALARM.decayRate * dt)
  state.peakAlarm = Math.max(state.peakAlarm, state.alarm)
  state.runPeakAlarm = Math.max(state.runPeakAlarm, state.alarm)

  if (state.alarm >= ALARM.suspiciousAt) {
    state.alarmTickTimer -= dt
    if (state.alarmTickTimer <= 0) { sfx.alarmTick(); state.alarmTickTimer = 0.7 }
  }
  if (state.alarm >= ALARM.max) return bust(state, 'The alarm hit 100% — lockdown, and the vault sealed.')

  // Grab loot with E.
  if (state.keys.has('e')) {
    const item = lootInReach(thief, state.world.loot)
    if (item) {
      item.taken = true
      state.keys.delete('e')
      burst(state, item.x, item.y, '#f2c94c')
      sfx.loot()
    }
  }

  // Exit only opens once every loot in the room is lifted.
  if (lootTaken(state) === lootTotal(state) && thiefOnExit(thief, state.world.exit)) {
    return clearLevel(state)
  }

  for (const p of state.particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
  }
  state.particles = state.particles.filter((p) => p.life > 0)
}

function bust(state, reason) {
  state.screen = 'busted'
  state.bustedReason = reason
  state.runValue = state.totalValue + state.world.loot
    .filter((l) => l.taken)
    .reduce((sum, l) => sum + LOOT_VALUE[l.kind], 0)
  sfx.caught()
}

function clearLevel(state) {
  const value = state.world.loot.reduce((sum, l) => sum + LOOT_VALUE[l.kind], 0)
  state.totalValue += value
  state.totalTime += state.elapsed
  state.lastClear = {
    time: Math.round(state.elapsed),
    value,
    peakAlarm: Math.floor(state.peakAlarm),
    spotted: state.levelSpotted,
  }
  burst(state, state.thief.x, state.thief.y, '#58d68d', 26)
  sfx.win()
  if (state.levelIndex + 1 >= LEVELS.length) {
    state.screen = 'won'
    state.finalStats = {
      value: state.totalValue,
      time: `${Math.floor(state.totalTime / 60)}:${String(Math.floor(state.totalTime % 60)).padStart(2, '0')}`,
      spotted: state.spottedCount,
      peakAlarm: Math.floor(state.runPeakAlarm),
      coins: state.thief.coins,
    }
  } else {
    state.screen = 'levelclear'
  }
}

export function nextLevel(state) {
  loadLevel(state, state.levelIndex + 1)
}

export function restartLevel(state) {
  loadLevel(state, state.levelIndex)
}

// Start the whole job over from room 1, forgetting the take so far.
export function restartRun(state) {
  state.totalValue = 0
  state.totalTime = 0
  state.spottedCount = 0
  state.runPeakAlarm = 0
  loadLevel(state, 0)
}
