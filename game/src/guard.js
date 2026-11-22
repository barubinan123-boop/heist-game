// Guards: patrol waypoints, spot the thief through a vision cone, chase
// when fully alerted, and investigate a thrown coin's ping.
import { CONFIG } from './config.js';
import { sightBlocked, angleDiff, dist } from './util.js';
import { isWall } from './level.js';
import { spotFactor } from './thief.js';

function tileBlocked(x, y) {
  return isWall(Math.floor(x / CONFIG.tile), Math.floor(y / CONFIG.tile));
}

function canSeeGuard(g, state) {
  const t = state.thief;
  const d = dist(g.x, g.y, t.x, t.y);
  if (d > CONFIG.guardViewRange) return false;
  const toThief = Math.atan2(t.y - g.y, t.x - g.x);
  if (Math.abs(angleDiff(g.angle, toThief)) > CONFIG.guardViewHalfAngle) return false;
  return !sightBlocked(g.x, g.y, t.x, t.y, tileBlocked);
}

export function updateGuards(state, dt) {
  for (const g of state.guards) {
    // A fresh ping pulls a patrolling guard over to look.
    if (g.state === 'patrol') {
      for (const p of state.pings) {
        if (p.landed && p.age < 4 && dist(g.x, g.y, p.x, p.y) < CONFIG.coinLureRadius) {
          g.state = 'investigate';
          g.target = { x: p.x, y: p.y };
          break;
        }
      }
    }

    const seen = canSeeGuard(g, state);
    if (seen) {
      let rate = CONFIG.guardSpotRate * spotFactor(state);
      if (dist(g.x, g.y, state.thief.x, state.thief.y) < 100) {
        rate += CONFIG.guardSpotCloseBonus;
      }
      g.alert = Math.min(100, g.alert + rate * dt);
      if (g.alert >= 100 && g.state !== 'chase') {
        g.state = 'chase';
        state.events.push({ type: 'spot', name: g.name });
      }
    } else {
      g.alert = Math.max(0, g.alert - CONFIG.guardCalmRate * dt);
      if (g.state === 'chase' && g.alert < 40) {
        g.state = 'patrol';
        g.target = null;
      }
    }

    if (g.state === 'chase') {
      state.alarm = Math.min(100, state.alarm + CONFIG.chaseAlarmRate * dt);
      moveToward(g, state.thief.x, state.thief.y, CONFIG.guardChaseSpeed, dt);
      g.angle = Math.atan2(state.thief.y - g.y, state.thief.x - g.x);
      if (dist(g.x, g.y, state.thief.x, state.thief.y) < CONFIG.guardCatchRange) {
        state.phase = 'caught';
        state.caughtBy = g.name;
        state.events.push({ type: 'caught' });
      }
    } else if (g.state === 'investigate' && g.target) {
      const arrived = moveToward(g, g.target.x, g.target.y, CONFIG.guardInvestigateSpeed, dt);
      if (arrived) {
        g.wait += dt;
        if (g.wait > 1.6) {
          g.state = 'patrol';
          g.target = null;
          g.wait = 0;
          g.leg = nearestLeg(g);
        }
      }
    } else {
      patrolStep(g, dt);
    }
  }
}

function nearestLeg(g) {
  let best = 0;
  let bestD = Infinity;
  g.path.forEach((p, i) => {
    const d = dist(g.x, g.y, p.x, p.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function patrolStep(g, dt) {
  if (g.wait > 0) {
    g.wait -= dt;
    return;
  }
  const target = g.path[g.leg];
  const arrived = moveToward(g, target.x, target.y, CONFIG.guardPatrolSpeed, dt);
  if (arrived) {
    g.wait = 1.1;
    g.leg = (g.leg + 1) % g.path.length;
  }
}

// Walk toward a point, facing the way we move. Returns true on arrival.
function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  const step = Math.min(d, speed * dt);
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  g.angle = Math.atan2(dy, dx);
  return d - step < 4;
}
