// Wall-mounted security cameras: they sweep a cone back and forth, and
// feed the alarm meter while the thief is inside it.
import { CONFIG } from './config.js';
import { sightBlocked, angleDiff, dist } from './util.js';
import { isWall } from './level.js';
import { spotFactor } from './thief.js';

function tileBlocked(x, y) {
  return isWall(Math.floor(x / CONFIG.tile), Math.floor(y / CONFIG.tile));
}

export function updateCameras(state, dt) {
  for (const c of state.cameras) {
    c.sweepT += CONFIG.cameraSweepSpeed * dt;
    c.angle = c.baseAngle + Math.sin(c.sweepT) * CONFIG.cameraSweep;

    const t = state.thief;
    const d = dist(c.x, c.y, t.x, t.y);
    let seeing = false;
    if (d <= CONFIG.cameraRange) {
      const toThief = Math.atan2(t.y - c.y, t.x - c.x);
      if (Math.abs(angleDiff(c.angle, toThief)) <= CONFIG.cameraHalfAngle) {
        seeing = !sightBlocked(c.x, c.y, t.x, t.y, tileBlocked);
      }
    }
    c.seeing = seeing;
    if (seeing) {
      const rate = CONFIG.cameraAlarmRate * spotFactor(state);
      state.alarm = Math.min(100, state.alarm + rate * dt);
    }
  }
}
