// Bootstrap: input, the animation loop, and the screens. The game runs at a
// fixed 60 Hz step so a room plays the same on any machine.
//
// ?demo=cover | alarm | diamond | win renders a frozen, staged moment of the
// game — the same code path as playing, with the clock held still — so the
// screenshots show the game at its best.

import { VIEW_W, VIEW_H, TILE } from './config.js'
import { newGame, loadLevel, update, nextLevel, restartLevel, restartRun, lootTaken, lootTotal } from './game.js'
import { render } from './render.js'
import { throwCoin } from './player.js'
import { unlockAudio, toggleMute } from './audio.js'

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const state = newGame()

const params = new URLSearchParams(window.location.search)
const demo = params.get('demo')

loadLevel(state, 0)
state.screen = 'title'

if (demo) stageDemo(state, demo)

function stageDemo(st, kind) {
  if (kind === 'cover') {
    // Mid-room, mid-patrol: the thief slips between two cones toward a painting.
    st.screen = 'playing'
    st.thief.x = 9 * TILE + 16
    st.thief.y = 9 * TILE + 16
    st.thief.facing = Math.PI / 2
    st.time = 3.4
    st.alarm = 18
    st.guards[0].x = 22 * TILE + 16
    st.guards[0].y = 3 * TILE + 16
    st.guards[0].angle = Math.PI
    st.guards[1].x = 8 * TILE + 16
    st.guards[1].y = 11 * TILE + 16
    st.guards[1].angle = -Math.PI / 2
    st.guards[2].x = 7 * TILE + 16
    st.guards[2].y = 16 * TILE + 16
    st.guards[2].angle = 0
    st.world.loot[0].taken = true
  } else if (kind === 'alarm') {
    // Room 2, caught in a camera cone with the alarm climbing.
    loadLevel(st, 1)
    st.screen = 'playing'
    st.thief.x = 15 * TILE + 16
    st.thief.y = 10 * TILE + 16
    st.thief.facing = Math.PI
    st.time = 6.2
    st.alarm = 72
    st.seenNow = true
    st.guards[0].x = 21 * TILE + 16
    st.guards[0].y = 4 * TILE + 16
    st.guards[0].angle = Math.PI / 2
    st.guards[0].state = 'chase'
    st.guards[1].x = 6 * TILE + 16
    st.guards[1].y = 11 * TILE + 16
    st.guards[1].angle = 0
    st.guards[2].x = 20 * TILE + 16
    st.guards[2].y = 13 * TILE + 16
    st.guards[2].angle = -Math.PI / 2
    st.cameras[0].angle = Math.PI * 0.9
    st.cameras[1].angle = Math.PI / 2
    st.world.loot[0].taken = true
    st.world.loot[1].taken = true
  } else if (kind === 'diamond') {
    // Room 3, the diamond vault: lasers on, thief at the vault door.
    loadLevel(st, 2)
    st.screen = 'playing'
    st.thief.x = 14 * TILE + 16
    st.thief.y = 9 * TILE + 16
    st.thief.facing = Math.PI / 2
    st.thief.sneaking = true
    st.time = 0.4
    st.alarm = 31
    st.guards[0].x = 7 * TILE + 16
    st.guards[0].y = 3 * TILE + 16
    st.guards[0].angle = Math.PI / 2
    st.guards[1].x = 17 * TILE + 16
    st.guards[1].y = 4 * TILE + 16
    st.guards[1].angle = Math.PI
    st.guards[2].x = 26 * TILE + 16
    st.guards[2].y = 3 * TILE + 16
    st.guards[2].angle = Math.PI / 2
    st.cameras[0].angle = Math.PI * 0.75
    st.cameras[1].angle = Math.PI * 0.15
    st.world.loot[0].taken = true
    st.world.loot[1].taken = true
  } else if (kind === 'win') {
    // The payoff screen after the third room.
    loadLevel(st, 2)
    st.screen = 'won'
    st.world.loot.forEach((item) => { item.taken = true })
    st.finalStats = { value: 62400, time: '6:42', spotted: 3, peakAlarm: 78, coins: 1 }
    st.totalValue = 62400
  }
}

// --- Input: keyboard moves, mouse throws coins, Enter advances screens. ---

const KEYMAP = {
  arrowup: 'arrowup', arrowdown: 'arrowdown', arrowleft: 'arrowleft', arrowright: 'arrowright',
  w: 'w', a: 'a', s: 's', d: 'd', shift: 'shift', e: 'e',
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault()
  unlockAudio()

  if (key === 'm') { toggleMute(); return }
  if (key === 'p' && state.screen === 'playing') { state.screen = 'paused'; return }
  if (key === 'p' && state.screen === 'paused') { state.screen = 'playing'; return }
  if (key === 'r' && state.screen === 'busted') { restartLevel(state); state.screen = 'playing'; return }
  if (key === 'r' && state.screen === 'won') { restartRun(state); state.screen = 'playing'; return }
  if (key === 'r' && state.screen === 'playing') { restartLevel(state); return }
  if (key === 'enter') {
    if (state.screen === 'title') { state.screen = 'playing'; return }
    if (state.screen === 'levelclear') { nextLevel(state); return }
    if (state.screen === 'won') { restartRun(state); state.screen = 'playing'; return }
  }
  if (KEYMAP[key]) state.keys.add(KEYMAP[key])
})

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase()
  if (KEYMAP[key]) state.keys.delete(KEYMAP[key])
})

canvas.addEventListener('mousedown', (event) => {
  unlockAudio()
  if (state.screen === 'title') { state.screen = 'playing'; return }
  if (state.screen === 'levelclear') { nextLevel(state); return }
  if (state.screen !== 'playing') return
  const rect = canvas.getBoundingClientRect()
  const px = ((event.clientX - rect.left) / rect.width) * VIEW_W
  const py = ((event.clientY - rect.top) / rect.height) * VIEW_H
  throwCoin(state.thief, state.world, px, py)
})

// --- Loop: fixed 60 Hz steps, render every frame. ---

let last = performance.now()
let acc = 0
const STEP = 1000 / 60

function frame(now) {
  const elapsed = Math.min(100, now - last)
  last = now
  if (!demo) {
    acc += elapsed
    while (acc >= STEP) {
      update(state, STEP / 1000)
      acc -= STEP
    }
  }
  render(ctx, {
    ...state,
    lootTaken: lootTaken(state),
    lootTotal: lootTotal(state),
  })
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
