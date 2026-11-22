// Canvas drawing for Sable & Smoke: the gallery floor, wall-clipped vision
// cones, the thief, the guards, the cameras, the loot and the HUD.
import { CONFIG } from './config.js';
import { isWall, tileAt, VAULT_DOOR, EXIT, STAR_POS } from './level.js';
import { dist } from './util.js';

export const HUD_H = 60;

const C = CONFIG.colors;

// March a ray from (x, y) along `angle` until it hits a wall or `range`.
function rayHit(x, y, angle, range) {
  const step = 7;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let px = x;
  let py = y;
  for (let d = step; d <= range; d += step) {
    px += dx;
    py += dy;
    const tx = Math.floor(px / CONFIG.tile);
    const ty = Math.floor(py / CONFIG.tile);
    if (isWall(tx, ty)) return d;
  }
  return range;
}

function drawCone(ctx, x, y, angle, halfAngle, range, fill) {
  const rays = 14;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayHit(x, y, a, range);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawFloor(ctx) {
  for (let ty = 0; ty < CONFIG.rows; ty++) {
    for (let tx = 0; tx < CONFIG.cols; tx++) {
      const tile = tileAt(tx, ty);
      const px = tx * CONFIG.tile;
      const py = ty * CONFIG.tile + HUD_H;
      if (tile === '#') {
        ctx.fillStyle = C.wall;
        ctx.fillRect(px, py, CONFIG.tile, CONFIG.tile);
        ctx.fillStyle = C.wallTop;
        ctx.fillRect(px, py, CONFIG.tile, 4);
        continue;
      }
      const vault = tx >= 12 && tx <= 17 && ty >= 1 && ty <= 4;
      if (tile === 'S') {
        ctx.fillStyle = C.floorShadow;
      } else if (vault) {
        ctx.fillStyle = C.vaultFloor;
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? C.floorA : C.floorB;
      }
      ctx.fillRect(px, py, CONFIG.tile, CONFIG.tile);
      // Thin marble grout lines on the gallery floor.
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(px + 0.5, py + 0.5, CONFIG.tile - 1, CONFIG.tile - 1);
    }
  }
}

function drawLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    const y = item.y + HUD_H;
    if (item.kind === 'coin') {
      ctx.beginPath();
      ctx.arc(item.x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = C.gold;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.goldDark;
      ctx.stroke();
      ctx.fillStyle = C.goldDark;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', item.x, y + 0.5);
    } else if (item.kind === 'painting') {
      ctx.fillStyle = '#6b4f2a';
      ctx.fillRect(item.x - 13, y - 9, 26, 18);
      ctx.fillStyle = '#8fb8a8';
      ctx.fillRect(item.x - 10, y - 6, 20, 12);
      ctx.fillStyle = C.goldDark;
      ctx.fillRect(item.x - 10, y - 6, 20, 2);
      ctx.fillStyle = '#f5e9c8';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$200', item.x, y - 14);
    } else if (item.kind === 'star') {
      const pulse = 1 + Math.sin(state.time * 3) * 0.12;
      ctx.save();
      ctx.translate(item.x, y);
      ctx.scale(pulse, pulse);
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fillStyle = '#bfe8ff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#dff4ff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAR OF HALCYON', item.x, y - 20);
    }
  }
}

function drawExitAndVault(ctx, state) {
  // Exit door, bottom centre.
  const ey = EXIT.y + HUD_H;
  ctx.fillStyle = state.loot.some((i) => i.kind === 'star' && i.taken) ? C.exit : '#3f7d5a';
  ctx.fillRect(EXIT.x - 16, ey - 14, 32, 28);
  ctx.fillStyle = '#0e1a13';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', EXIT.x, ey + 3);
  ctx.strokeStyle = C.exit;
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT.x - 16, ey - 14, 32, 28);

  // Vault door: a gold hatch with VAULT written across it while locked.
  const vy = VAULT_DOOR.y + HUD_H;
  ctx.fillStyle = state.vaultOpen ? '#2e2a33' : C.goldDark;
  ctx.fillRect(VAULT_DOOR.x - 16, vy - 16, 32, 32);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(VAULT_DOOR.x - 16, vy - 16, 32, 32);
  if (!state.vaultOpen) {
    ctx.fillStyle = '#0e1a13';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT', VAULT_DOOR.x, vy - 5);
    ctx.beginPath();
    ctx.arc(VAULT_DOOR.x, vy + 6, 5, 0, Math.PI * 2);
    ctx.fillStyle = C.gold;
    ctx.fill();
  } else {
    ctx.fillStyle = C.gold;
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', VAULT_DOOR.x, vy + 3);
  }
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    const y = g.y + HUD_H;
    const hot = g.state === 'chase' || g.alert > 55;
    drawCone(ctx, g.x, y, g.angle, CONFIG.guardViewHalfAngle, CONFIG.guardViewRange, hot ? C.coneHot : C.cone);
  }
  for (const g of state.guards) {
    const y = g.y + HUD_H;
    ctx.beginPath();
    ctx.arc(g.x, y, CONFIG.guardRadius, 0, Math.PI * 2);
    ctx.fillStyle = g.state === 'chase' ? '#ff5b5b' : C.guard;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.guardDark;
    ctx.stroke();
    // Facing tick.
    ctx.beginPath();
    ctx.moveTo(g.x, y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 15, y + Math.sin(g.angle) * 15);
    ctx.strokeStyle = '#ffd9d9';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Alertness arc above the guard.
    if (g.alert > 2) {
      ctx.beginPath();
      ctx.arc(g.x, y - 18, 7, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.alert) / 100);
      ctx.strokeStyle = g.alert > 55 ? C.alarmRed : C.alarmAmber;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = '#f3d9d9';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name.toUpperCase(), g.x, y - 26);
  }
}

function drawCameras(ctx, state) {
  for (const c of state.cameras) {
    const y = c.y + HUD_H;
    drawCone(ctx, c.x, y, c.angle, CONFIG.cameraHalfAngle, CONFIG.cameraRange, C.cameraCone);
  }
  for (const c of state.cameras) {
    const y = c.y + HUD_H;
    ctx.fillStyle = '#2c3444';
    ctx.fillRect(c.x - 8, y - 8, 16, 16);
    ctx.strokeStyle = c.seeing ? C.alarmRed : '#7fb8e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - 8, y - 8, 16, 16);
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 4, y + Math.sin(c.angle) * 4, 3, 0, Math.PI * 2);
    ctx.fillStyle = c.seeing ? C.alarmRed : '#9fd0f5';
    ctx.fill();
    ctx.fillStyle = '#9fd0f5';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAM', c.x, y - 12);
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  const y = t.y + HUD_H;
  // Thrown-coin pings.
  for (const p of state.pings) {
    const py = p.y + HUD_H;
    ctx.beginPath();
    ctx.arc(p.x, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = C.gold;
    ctx.fill();
    if (p.landed) {
      const rr = 8 + ((p.age * 20) % 14);
      ctx.beginPath();
      ctx.arc(p.x, py, rr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(242,193,78,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // Sable.
  ctx.beginPath();
  ctx.arc(t.x, y, CONFIG.thiefRadius, 0, Math.PI * 2);
  ctx.fillStyle = C.thiefCoat;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = t.sneaking ? '#7fb8e8' : C.thief;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.angle) * 5, y + Math.sin(t.angle) * 5, 4, 0, Math.PI * 2);
  ctx.fillStyle = C.thief;
  ctx.fill();
  if (t.sneaking) {
    ctx.fillStyle = '#9fd0f5';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', t.x, y - 17);
  }
  // Vault hack progress ring.
  if (t.hack > 0 && t.hack < 1) {
    ctx.beginPath();
    ctx.arc(t.x, y - 20, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.hack);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HACKING…', t.x, y - 32);
  }
  // Floating +$ popups.
  for (const f of state.floaters) {
    const alpha = Math.max(0, 1 - f.age / 1.1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.gold;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y + HUD_H - f.age * 26);
    ctx.globalAlpha = 1;
  }
}

function alarmColor(alarm) {
  if (alarm > 70) return C.alarmRed;
  if (alarm > 35) return C.alarmAmber;
  return C.alarmGreen;
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#12141a';
  ctx.fillRect(0, 0, CONFIG.viewW, HUD_H);
  ctx.fillStyle = '#2a2f3c';
  ctx.fillRect(0, HUD_H - 2, CONFIG.viewW, 2);

  // Alarm meter.
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALARM', 14, 20);
  ctx.fillStyle = '#2a2f3c';
  ctx.fillRect(80, 10, 220, 20);
  ctx.fillStyle = alarmColor(state.alarm);
  ctx.fillRect(80, 10, 220 * (state.alarm / 100), 20);
  ctx.strokeStyle = '#4d5870';
  ctx.lineWidth = 1;
  ctx.strokeRect(80, 10, 220, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`${Math.round(state.alarm)}%`, 308, 20);

  // Take and tools.
  ctx.fillStyle = C.gold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`TAKE $${state.take.toLocaleString('en-US')}`, 360, 20);
  ctx.fillStyle = '#c9c4b4';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Coins ${state.thief.coins}  ·  Q/click: throw decoy  ·  Shift: sneak  ·  E: hack vault`, 520, 20);

  // Objective line.
  const starTaken = state.loot.some((i) => i.kind === 'star' && i.taken);
  ctx.fillStyle = starTaken ? C.exit : '#9fb8d8';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    starTaken ? '★ Star secured — reach the green EXIT!' : 'Objective: steal the Star of Halcyon, then reach the EXIT',
    14, 46,
  );

  // SPOTTED warning.
  const spotted = state.guards.some((g) => g.state === 'chase') || state.cameras.some((c) => c.seeing);
  if (spotted && state.phase === 'play') {
    const blink = Math.sin(state.time * 10) > 0;
    ctx.fillStyle = blink ? C.alarmRed : '#ffb3b3';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('SPOTTED!', CONFIG.viewW - 16, 46);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 12, 18, 0.78)';
  ctx.fillRect(0, 0, CONFIG.viewW, CONFIG.viewH + HUD_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, CONFIG.viewW / 2, 300);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '15px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CONFIG.viewW / 2, 340 + i * 26);
  });
  ctx.textAlign = 'left';
}

export function draw(ctx, state) {
  ctx.clearRect(0, 0, CONFIG.viewW, CONFIG.viewH + HUD_H);
  drawFloor(ctx);
  drawExitAndVault(ctx, state);
  drawLoot(ctx, state);
  drawGuards(ctx, state);
  drawCameras(ctx, state);
  drawThief(ctx, state);
  drawHud(ctx, state);

  if (state.phase === 'title') {
    overlay(ctx, 'SABLE & SMOKE', [
      'The Halcyon Gallery Heist — steal the Star of Halcyon.',
      'WASD / arrows to move · Shift to sneak · Q or click to throw a coin',
      'Hold E at the vault door to hack it · Avoid cones and cameras',
      'Grab the Star, then slip out through the green EXIT.',
      '',
      'Press Enter or click to begin',
    ], C.gold);
  } else if (state.phase === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      state.caughtBy ? `Guard ${state.caughtBy} grabbed Sable.` : 'The alarm hit 100% — lockdown.',
      `Take lost: $${state.take.toLocaleString('en-US')}`,
      '',
      'Press R to try again',
    ], C.alarmRed);
  } else if (state.phase === 'win') {
    overlay(ctx, 'CLEAN GETAWAY', [
      `Sable slips into the night with the Star of Halcyon.`,
      `Total take: $${state.take.toLocaleString('en-US')}`,
      `Alarm at escape: ${Math.round(state.alarm)}%`,
      '',
      'Press R to play again',
    ], C.exit);
  }
}
