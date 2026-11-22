// Sable, the thief: movement, sneaking, coin decoys, the vault hack and
// picking up loot. All world queries go through the state object.
import { CONFIG } from './config.js';
import { isShadow, tileAt, VAULT_DOOR, EXIT } from './level.js';
import { moveCircle, dist } from './util.js';

export function createThief(start) {
  return {
    x: start.x,
    y: start.y,
    angle: -Math.PI / 2,
    sneaking: false,
    coins: CONFIG.coinThrowCount,
    hack: 0,
    moving: false,
  };
}

// How fast the thief is spotted right now: shadow floor and sneaking help.
export function spotFactor(state) {
  const t = state.thief;
  let f = 1;
  const tx = Math.floor(t.x / CONFIG.tile);
  const ty = Math.floor(t.y / CONFIG.tile);
  if (isShadow(tx, ty)) f *= CONFIG.shadowSpotFactor;
  if (t.sneaking) f *= CONFIG.sneakSpotFactor;
  return f;
}

export function updateThief(state, input, dt) {
  const t = state.thief;
  const k = input.keys;

  // Movement: WASD or arrows. Shift sneaks.
  let mx = 0;
  let my = 0;
  if (k.has('a') || k.has('arrowleft')) mx -= 1;
  if (k.has('d') || k.has('arrowright')) mx += 1;
  if (k.has('w') || k.has('arrowup')) my -= 1;
  if (k.has('s') || k.has('arrowdown')) my += 1;
  t.sneaking = k.has('shift');
  t.moving = mx !== 0 || my !== 0;

  if (t.moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const speed = t.sneaking ? CONFIG.thiefSneakSpeed : CONFIG.thiefSpeed;
    t.angle = Math.atan2(my, mx);
    const solid = (tx, ty) => {
      const tile = tileAt(tx, ty);
      if (tile === 'V') return !state.vaultOpen;
      return tile === '#';
    };
    const next = moveCircle(t.x, t.y, CONFIG.thiefRadius, mx * speed * dt, my * speed * dt, solid);
    t.x = next.x;
    t.y = next.y;
  }

  // Coin decoy: Q or a mouse click throws one toward the cursor.
  if ((input.consume('q') || input.consumeClick()) && t.coins > 0) {
    const dx = input.mouse.x - t.x;
    const dy = input.mouse.y - t.y;
    const d = Math.hypot(dx, dy) || 1;
    const range = Math.min(d, CONFIG.coinThrowRange);
    const lx = t.x + (dx / d) * range;
    const ly = t.y + (dy / d) * range;
    t.coins -= 1;
    state.pings.push({ x: lx, y: ly, age: 0, landed: false, fly: 0 });
    state.events.push({ type: 'coin' });
  }

  // Vault hack: hold E beside the closed vault door.
  const nearVault = dist(t.x, t.y, VAULT_DOOR.x, VAULT_DOOR.y) < 52;
  if (!state.vaultOpen && nearVault && k.has('e')) {
    t.hack += dt / CONFIG.vaultHackSeconds;
    if (t.hack >= 1) {
      state.vaultOpen = true;
      t.hack = 0;
      state.events.push({ type: 'vault' });
    }
  } else if (t.hack > 0) {
    t.hack = Math.max(0, t.hack - dt * 2);
  }

  // Pick up loot on touch. The Star waits behind the vault door.
  for (const item of state.loot) {
    if (item.taken) continue;
    if (item.kind === 'star' && !state.vaultOpen) continue;
    if (dist(t.x, t.y, item.x, item.y) < 22) {
      item.taken = true;
      state.take += item.value;
      state.floaters.push({ x: item.x, y: item.y - 10, text: `+$${item.value}`, age: 0 });
      state.events.push({ type: item.kind === 'star' ? 'star' : 'pickup' });
    }
  }

  // The getaway: Star in hand, reach the green exit.
  const starTaken = state.loot.some((i) => i.kind === 'star' && i.taken);
  if (starTaken && dist(t.x, t.y, EXIT.x, EXIT.y) < 26) {
    state.phase = 'win';
    state.events.push({ type: 'win' });
  }
}
