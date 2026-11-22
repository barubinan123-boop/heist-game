// Everything the eye sees: the room, the cones, the thief, the loot, the HUD
// and the screens between rooms. Vision cones are raycast, so a wall or a
// crate really does cut them off — cover you can trust.

import { TILE, VIEW_W, VIEW_H, COLORS, GUARD, CAMERA, ALARM } from './config.js'
import { isSolid, beamOn } from './world.js'
import { coinPosition } from './player.js'

// Build a vision cone as a polygon: cast a fan of rays and stop each one at
// the first solid tile, so walls and crates clip the cone for real.
export function conePolygon(world, x, y, angle, halfAngle, range) {
  const rays = 26
  const pts = [{ x, y }]
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    let r = range
    for (let d = 8; d <= range; d += 6) {
      if (isSolid(world, x + dx * d, y + dy * d)) { r = d; break }
    }
    pts.push({ x: x + dx * r, y: y + dy * r })
  }
  return pts
}

function fillPolygon(ctx, pts, fill) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function drawCone(ctx, world, x, y, angle, halfAngle, range, seen) {
  const pts = conePolygon(world, x, y, angle, halfAngle, range)
  fillPolygon(ctx, pts, seen ? COLORS.coneGuardSeen : COLORS.coneGuard)
}

export function render(ctx, state) {
  const { world, thief, guards, cameras, particles } = state
  ctx.clearRect(0, 0, VIEW_W, VIEW_H)

  drawFloor(ctx, world)
  drawCones(ctx, state)
  drawLasers(ctx, world, state.time)
  drawCratesAndWalls(ctx, world)
  drawLoot(ctx, world)
  drawExit(ctx, world)
  drawCameras(ctx, cameras)
  drawCoins(ctx, thief)
  drawGuards(ctx, guards)
  drawThief(ctx, thief)
  drawParticles(ctx, particles)
  drawHud(ctx, state)

  if (state.screen === 'title') drawTitle(ctx, state)
  if (state.screen === 'paused') drawPaused(ctx)
  if (state.screen === 'busted') drawBusted(ctx, state)
  if (state.screen === 'levelclear') drawLevelClear(ctx, state)
  if (state.screen === 'won') drawWon(ctx, state)
}

function drawFloor(ctx, world) {
  for (let y = 0; y < world.rows; y++) {
    for (let x = 0; x < world.cols; x++) {
      const ch = world.grid[y][x]
      if (ch === '#') continue
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
      // Laser tiles and the exit get their own floor tint.
      if (ch === '|' || ch === '-') {
        ctx.fillStyle = 'rgba(255, 46, 99, 0.10)'
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
      }
    }
  }
}

function drawCones(ctx, state) {
  const { world, guards, cameras, thief } = state
  for (const cam of cameras) {
    const pts = conePolygon(world, cam.x, cam.y, cam.angle, CAMERA.halfAngle, CAMERA.sightRange)
    fillPolygon(ctx, pts, cam.seenFlash > 0 ? COLORS.coneCameraSeen : COLORS.coneCamera)
  }
  for (const guard of guards) {
    drawCone(ctx, world, guard.x, guard.y, guard.angle, GUARD.halfAngle, GUARD.sightRange, guard.seenFlash > 0)
  }
}

function drawLasers(ctx, world, time) {
  for (const beam of world.lasers) {
    const on = beamOn(beam, time)
    for (const t of beam.tiles) {
      const cx = t.tx * TILE + TILE / 2
      const cy = t.ty * TILE + TILE / 2
      ctx.save()
      ctx.globalAlpha = on ? 0.95 : 0.22
      ctx.strokeStyle = COLORS.laser
      ctx.lineWidth = on ? 3 : 2
      ctx.shadowColor = COLORS.laser
      ctx.shadowBlur = on ? 12 : 0
      ctx.beginPath()
      if (beam.axis === 'v') { ctx.moveTo(cx, t.ty * TILE + 2); ctx.lineTo(cx, t.ty * TILE + TILE - 2) }
      else { ctx.moveTo(t.tx * TILE + 2, cy); ctx.lineTo(t.tx * TILE + TILE - 2, cy) }
      ctx.stroke()
      ctx.restore()
      if (on) {
        ctx.fillStyle = 'rgba(255, 46, 99, 0.85)'
        ctx.beginPath()
        ctx.arc(cx, cy, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

function drawCratesAndWalls(ctx, world) {
  for (let y = 0; y < world.rows; y++) {
    for (let x = 0; x < world.cols; x++) {
      const ch = world.grid[y][x]
      const px = x * TILE
      const py = y * TILE
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall
        ctx.fillRect(px, py, TILE, TILE)
        // A lit top edge so the walls read as walls, not holes.
        if (y === 0 || world.grid[y - 1][x] !== '#') {
          ctx.fillStyle = COLORS.wallTop
          ctx.fillRect(px, py, TILE, 5)
        }
      } else if (ch === 'C') {
        ctx.fillStyle = COLORS.crate
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4)
        ctx.fillStyle = COLORS.crateTop
        ctx.fillRect(px + 2, py + 2, TILE - 4, 6)
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 1
        ctx.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5)
        ctx.beginPath()
        ctx.moveTo(px + 2, py + 2)
        ctx.lineTo(px + TILE - 2, py + TILE - 2)
        ctx.stroke()
      }
    }
  }
}

function drawLoot(ctx, world) {
  for (const item of world.loot) {
    if (item.taken) continue
    const pulse = 0.65 + Math.sin(Date.now() / 300 + item.tx) * 0.2
    ctx.save()
    ctx.globalAlpha = pulse
    if (item.kind === 'painting') {
      ctx.fillStyle = '#8a6d2f'
      ctx.fillRect(item.x - 11, item.y - 14, 22, 28)
      ctx.fillStyle = '#c9a86a'
      ctx.fillRect(item.x - 8, item.y - 11, 16, 22)
      ctx.fillStyle = '#3f6d8e'
      ctx.fillRect(item.x - 8, item.y - 11, 16, 9)
      ctx.fillStyle = '#7a9a5a'
      ctx.fillRect(item.x - 8, item.y - 2, 16, 13)
    } else if (item.kind === 'vault') {
      ctx.fillStyle = '#1c2733'
      ctx.fillRect(item.x - 12, item.y - 12, 24, 24)
      ctx.strokeStyle = COLORS.vault
      ctx.lineWidth = 2
      ctx.strokeRect(item.x - 12, item.y - 12, 24, 24)
      ctx.beginPath()
      ctx.arc(item.x, item.y, 6, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      // The Meridian diamond.
      ctx.shadowColor = COLORS.diamond
      ctx.shadowBlur = 18
      ctx.fillStyle = COLORS.diamond
      ctx.beginPath()
      ctx.moveTo(item.x, item.y - 13)
      ctx.lineTo(item.x + 10, item.y - 2)
      ctx.lineTo(item.x, item.y + 12)
      ctx.lineTo(item.x - 10, item.y - 2)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.moveTo(item.x - 10, item.y - 2)
      ctx.lineTo(item.x + 10, item.y - 2)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawExit(ctx, world) {
  const { exit, loot } = world
  const open = loot.every((l) => l.taken)
  ctx.save()
  ctx.globalAlpha = open ? 0.9 + Math.sin(Date.now() / 250) * 0.1 : 0.35
  ctx.fillStyle = COLORS.exit
  ctx.fillRect(exit.x - 13, exit.y - 13, 26, 26)
  ctx.fillStyle = '#0b0a12'
  ctx.font = 'bold 15px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('EXIT', exit.x, exit.y + 1)
  ctx.restore()
  if (open) {
    ctx.save()
    ctx.strokeStyle = COLORS.exit
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.6
    ctx.strokeRect(exit.x - 16, exit.y - 16, 32, 32)
    ctx.restore()
  }
}

function drawCameras(ctx, cameras) {
  for (const cam of cameras) {
    ctx.save()
    ctx.translate(cam.x, cam.y)
    ctx.fillStyle = '#20242e'
    ctx.beginPath()
    ctx.arc(0, 0, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.rotate(cam.angle)
    ctx.fillStyle = COLORS.camera
    ctx.fillRect(0, -4, 15, 8)
    ctx.beginPath()
    ctx.arc(15, 0, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (cam.seenFlash > 0) {
      ctx.save()
      ctx.fillStyle = '#ff4646'
      ctx.beginPath()
      ctx.arc(cam.x, cam.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}

function drawCoins(ctx, thief) {
  for (const coin of thief.thrown) {
    const p = coinPosition(coin)
    ctx.save()
    ctx.fillStyle = '#f2c94c'
    ctx.strokeStyle = '#8a6d2f'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(p.x, p.y, coin.landed ? 5 : 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}

function drawGuards(ctx, guards) {
  for (const guard of guards) {
    ctx.save()
    // A soft shadow under the guard.
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(guard.x, guard.y + 8, 12, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.translate(guard.x, guard.y)
    ctx.fillStyle = guard.state === 'chase' ? '#ff2e2e' : COLORS.guard
    ctx.beginPath()
    ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2b0d0d'
    ctx.lineWidth = 2
    ctx.stroke()
    // Facing tick and eyes, so the patrol direction reads at a glance.
    ctx.rotate(guard.angle)
    ctx.fillStyle = '#ffd66a'
    ctx.beginPath()
    ctx.arc(6, -4, 2.2, 0, Math.PI * 2)
    ctx.arc(6, 4, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (guard.state === 'chase' || guard.state === 'investigate') {
      ctx.save()
      ctx.fillStyle = guard.state === 'chase' ? '#ff4646' : '#ffd66a'
      ctx.font = 'bold 16px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 18)
      ctx.restore()
    }
  }
}

function drawThief(ctx, thief) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(thief.x, thief.y + 8, 11, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.translate(thief.x, thief.y)
  // Hooded figure: dark cloak, pale face, gold trim.
  ctx.fillStyle = '#3a3348'
  ctx.beginPath()
  ctx.arc(0, 0, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = COLORS.loot
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.rotate(thief.facing)
  ctx.fillStyle = COLORS.player
  ctx.beginPath()
  ctx.arc(4, 0, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  if (thief.sneaking) {
    ctx.save()
    ctx.fillStyle = 'rgba(232, 226, 208, 0.75)'
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('sneaking', thief.x, thief.y - 18)
    ctx.restore()
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, p.life / p.max)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawHud(ctx, state) {
  const { alarm, lootTaken, lootTotal, thief, levelIndex, elapsed, seenNow } = state
  ctx.save()
  // Top bar.
  ctx.fillStyle = 'rgba(7, 7, 13, 0.82)'
  ctx.fillRect(0, 0, VIEW_W, 46)
  ctx.fillStyle = '#2e2844'
  ctx.fillRect(0, 46, VIEW_W, 2)

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#e8e2d0'
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.fillText(state.levelName, 14, 16)
  ctx.fillStyle = '#9d94b8'
  ctx.font = '12px system-ui, sans-serif'
  ctx.fillText(state.levelBrief, 14, 33)

  // Loot and coins, centre.
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.loot
  ctx.font = 'bold 15px system-ui, sans-serif'
  ctx.fillText(`Loot ${lootTaken}/${lootTotal}`, VIEW_W / 2 - 60, 23)
  ctx.fillStyle = '#e8e2d0'
  ctx.fillText(`Coins ${thief.coins}`, VIEW_W / 2 + 40, 23)

  // Timer.
  ctx.textAlign = 'right'
  ctx.fillStyle = '#9d94b8'
  ctx.font = '13px system-ui, sans-serif'
  ctx.fillText(`${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`, VIEW_W - 250, 23)

  // Alarm meter, top right — the number the whole heist hangs on.
  const ax = VIEW_W - 232
  const ay = 12
  const aw = 200
  const ah = 16
  ctx.textAlign = 'left'
  ctx.fillStyle = alarm >= ALARM.suspiciousAt ? '#ff6b6b' : '#9d94b8'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.fillText('ALARM', ax, ay - 2 + 8)
  ctx.fillStyle = '#1a1626'
  ctx.fillRect(ax + 52, ay, aw - 52, ah)
  const frac = Math.max(0, Math.min(1, alarm / ALARM.max))
  const grad = ctx.createLinearGradient(ax + 52, 0, ax + aw, 0)
  grad.addColorStop(0, '#58d68d')
  grad.addColorStop(0.55, '#f2c94c')
  grad.addColorStop(1, '#ff2e2e')
  ctx.fillStyle = grad
  ctx.fillRect(ax + 52, ay, (aw - 52) * frac, ah)
  ctx.strokeStyle = '#3a2f5e'
  ctx.strokeRect(ax + 52.5, ay + 0.5, aw - 52, ah)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${Math.floor(alarm)}%`, ax + 52 + (aw - 52) / 2, ay + 8)

  if (seenNow) {
    ctx.fillStyle = '#ff4646'
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.globalAlpha = 0.75 + Math.sin(Date.now() / 90) * 0.25
    ctx.fillText('SPOTTED!', VIEW_W / 2, 78)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

function overlay(ctx, title, lines, accent) {
  ctx.save()
  ctx.fillStyle = 'rgba(5, 5, 10, 0.78)'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = accent
  ctx.font = 'bold 42px Georgia, serif'
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 90)
  ctx.fillStyle = '#e8e2d0'
  ctx.font = '16px system-ui, sans-serif'
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 30 + i * 28))
  ctx.restore()
}

function drawTitle(ctx, state) {
  overlay(ctx, 'MIDNIGHT AT THE', [], '#f2c94c')
  ctx.save()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f2c94c'
  ctx.font = 'bold 52px Georgia, serif'
  ctx.fillText('MERIDIAN VAULT', VIEW_W / 2, VIEW_H / 2 - 44)
  ctx.fillStyle = '#e8e2d0'
  ctx.font = '16px system-ui, sans-serif'
  ctx.fillText('A three-room heist. Lift the loot, dodge the cones, mind the lasers,', VIEW_W / 2, VIEW_H / 2 + 8)
  ctx.fillText('and slip out before the alarm hits 100%.', VIEW_W / 2, VIEW_H / 2 + 34)
  ctx.fillStyle = '#9d94b8'
  ctx.font = '14px system-ui, sans-serif'
  ctx.fillText('WASD / arrows — move      Shift — sneak      E — grab loot', VIEW_W / 2, VIEW_H / 2 + 76)
  ctx.fillText('Click — throw a coin to distract a guard      P — pause      M — mute', VIEW_W / 2, VIEW_H / 2 + 100)
  ctx.fillStyle = '#f2c94c'
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 300) * 0.3
  ctx.fillText('Click or press Enter to begin the heist', VIEW_W / 2, VIEW_H / 2 + 150)
  ctx.restore()
}

function drawPaused(ctx) {
  overlay(ctx, 'PAUSED', ['The guards wait. The vault does not.', 'Press P to keep stealing.'], '#e8e2d0')
}

function drawBusted(ctx, state) {
  overlay(ctx, 'BUSTED', [
    state.bustedReason,
    `Room ${state.levelIndex + 1} — loot lifted so far: $${state.runValue.toLocaleString()}`,
    'Press R to try the room again.',
  ], '#ff4646')
}

function drawLevelClear(ctx, state) {
  const s = state.lastClear
  overlay(ctx, 'CLEAN GETAWAY', [
    `${state.levelName} cleared in ${s.time}s — loot $${s.value.toLocaleString()}`,
    `Alarm peaked at ${s.peakAlarm}%  ·  times spotted: ${s.spotted}`,
    'Press Enter for the next room.',
  ], '#58d68d')
}

function drawWon(ctx, state) {
  const s = state.finalStats
  overlay(ctx, 'THE MERIDIAN JOB', [
    `All three rooms cleared — total take $${s.value.toLocaleString()} in ${s.time}`,
    `Times spotted: ${s.spotted}  ·  peak alarm: ${s.peakAlarm}%  ·  coins left: ${s.coins}`,
    'Press R to run it again, cleaner this time.',
  ], '#f2c94c')
}
