// Deterministic staged scenes for the screenshots (?shot=cover|alarm|
// vault|escape). Each one freezes the game on a single readable frame
// that shows the heist at its best. Only the URL query drives it.
import { tileCenter } from './level.js';

// Place a guard at a tile, facing `angle`, in a given state.
function stageGuard(state, name, tx, ty, angle, guardState, alert) {
  const g = state.guards.find((x) => x.name === name);
  if (!g) return;
  const p = tileCenter(tx, ty);
  g.x = p.x;
  g.y = p.y;
  g.angle = angle;
  g.state = guardState;
  g.alert = alert;
}

export function applyShot(state, name) {
  const t = state.thief;
  if (name === 'cover') {
    // Mid-gallery sneak: thief between two cones, a camera sweeping,
    // loot on show, alarm low. Everything in one frame.
    const p = tileCenter(15, 10);
    t.x = p.x;
    t.y = p.y;
    t.sneaking = true;
    t.angle = -Math.PI / 2;
    stageGuard(state, 'Kess', 10, 10, 0, 'patrol', 22);
    stageGuard(state, 'Mara', 20, 8, Math.PI, 'patrol', 8);
    state.cameras[0].angle = Math.PI / 2 + 0.5;
    state.cameras[0].sweepT = 0.5;
    state.alarm = 18;
    state.phase = 'play';
  } else if (name === 'alarm') {
    // Spotted: a guard closes in, the meter runs hot.
    const p = tileCenter(14, 11);
    t.x = p.x;
    t.y = p.y;
    t.angle = Math.PI / 2;
    stageGuard(state, 'Kess', 13, 9, Math.PI / 2, 'chase', 100);
    stageGuard(state, 'Bram', 18, 14, -Math.PI / 2, 'chase', 100);
    state.cameras[1].seeing = true;
    state.cameras[1].angle = -Math.PI / 2 - 0.3;
    state.alarm = 72;
    state.phase = 'play';
  } else if (name === 'vault') {
    // Inside the vault, hand on the Star of Halcyon.
    state.vaultOpen = true;
    const p = tileCenter(13, 2);
    t.x = p.x;
    t.y = p.y;
    t.angle = 0;
    stageGuard(state, 'Ivo', 19, 4, Math.PI, 'patrol', 45);
    stageGuard(state, 'Mara', 8, 4, 0, 'patrol', 12);
    state.alarm = 30;
    state.phase = 'play';
  } else if (name === 'escape') {
    // The getaway: Star secured, slipping out with the take.
    state.vaultOpen = true;
    const star = state.loot.find((i) => i.kind === 'star');
    if (star) star.taken = true;
    state.take = 1450;
    state.alarm = 45;
    const p = tileCenter(15, 17);
    t.x = p.x;
    t.y = p.y;
    t.angle = Math.PI / 2;
    stageGuard(state, 'Bram', 10, 16, 0, 'chase', 100);
    state.phase = 'win';
  } else {
    return false;
  }
  state.frozen = true;
  return true;
}
