// Sable & Smoke — game loop, input and phase state. Boots the canvas,
// runs the thief, guards and cameras, and drains sound events.
import { CONFIG } from './config.js';
import { THIEF_START, freshLoot, freshGuards, freshCameras } from './level.js';
import { createThief, updateThief } from './thief.js';
import { updateGuards } from './guard.js';
import { updateCameras } from './camera.js';
import { draw, HUD_H } from './render.js';
import { applyShot } from './shots.js';
import { unlockAudio, playEvent, alarmTick } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.viewW;
canvas.height = CONFIG.viewH + HUD_H;

function freshState() {
  return {
    phase: 'title', // title | play | caught | win
    time: 0,
    alarm: 0,
    take: 0,
    vaultOpen: false,
    frozen: false,
    caughtBy: null,
    thief: createThief(THIEF_START),
    guards: freshGuards(),
    cameras: freshCameras(),
    loot: freshLoot(),
    pings: [],
    floaters: [],
    events: [],
  };
}

let state = freshState();

// Input: keys by lowercase name, mouse in map coordinates.
const input = {
  keys: new Set(),
  mouse: { x: CONFIG.viewW / 2, y: CONFIG.viewH / 2 },
  _click: false,
  consume(k) {
    if (!this.keys.has(k)) return false;
    this.keys.delete(k);
    return true;
  },
  consumeClick() {
    const c = this._click;
    this._click = false;
    return c;
  },
};

function keyName(e) {
  return e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
}

window.addEventListener('keydown', (e) => {
  const k = keyName(e);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (!e.repeat) input.keys.add(k);
  unlockAudio();
  if (state.phase === 'title' && (k === 'enter' || k === ' ')) {
    state.phase = 'play';
  } else if ((state.phase === 'caught' || state.phase === 'win') && k === 'r') {
    state = freshState();
  }
});
window.addEventListener('keyup', (e) => input.keys.delete(keyName(e)));
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  input.mouse.x = (e.clientX - r.left) * sx;
  input.mouse.y = (e.clientY - r.top) * sy - HUD_H;
});
canvas.addEventListener('mousedown', (e) => {
  unlockAudio();
  if (state.phase === 'title') {
    state.phase = 'play';
    return;
  }
  input._click = true;
});

// A staged screenshot scene (?shot=cover|alarm|vault|escape) freezes the
// game on one frame so the capture is stable.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) applyShot(state, shot);

function drainEvents() {
  for (const ev of state.events) playEvent(ev.type);
  state.events.length = 0;
}

function update(dt) {
  state.time += dt;
  // Thrown coins land and fade; floating +$ texts drift up and fade.
  for (const p of state.pings) {
    p.age += dt;
    if (p.age > 0.2) p.landed = true;
  }
  state.pings = state.pings.filter((p) => p.age < 5);
  for (const f of state.floaters) f.age += dt;
  state.floaters = state.floaters.filter((f) => f.age < 1.1);

  if (state.phase !== 'play' || state.frozen) return;
  updateThief(state, input, dt);
  updateGuards(state, dt);
  updateCameras(state, dt);

  // The alarm cools when nobody is watching.
  const watched =
    state.guards.some((g) => g.state === 'chase') || state.cameras.some((c) => c.seeing);
  if (!watched) {
    state.alarm = Math.max(0, state.alarm - CONFIG.alarmDecayRate * dt);
  }
  alarmTick(state.alarm, dt);

  if (state.alarm >= CONFIG.alarmLockdown && state.phase === 'play') {
    state.phase = 'caught';
    state.caughtBy = null;
    state.events.push({ type: 'caught' });
  }
  drainEvents();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
