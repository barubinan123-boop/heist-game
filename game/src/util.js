// Small math helpers shared by the heist modules. No dependencies.
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// Smallest signed difference between two angles, in (-PI, PI].
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the straight segment from (ax, ay) to (bx, by) crosses a wall
// tile. `blocked` answers whether tile (tx, ty) blocks sight.
export function sightBlocked(ax, ay, bx, by, blocked) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return false;
  const steps = Math.ceil(len / 6);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + dx * t;
    const y = ay + dy * t;
    if (blocked(x, y)) return true;
  }
  return false;
}

// Move a circle (x, y, r) by (dx, dy) against tile walls. `solid(tx, ty)`
// answers whether a tile is solid. Returns the new position.
export function moveCircle(x, y, r, dx, dy, solid) {
  let nx = x + dx;
  let ny = y + dy;
  // Resolve X first, then Y, so the thief slides along walls.
  if (circleHits(nx, y, r, solid)) nx = x;
  if (circleHits(nx, ny, r, solid)) ny = y;
  return { x: nx, y: ny };
}

function circleHits(x, y, r, solid) {
  const x0 = Math.floor((x - r) / 32);
  const x1 = Math.floor((x + r) / 32);
  const y0 = Math.floor((y - r) / 32);
  const y1 = Math.floor((y + r) / 32);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!solid(tx, ty)) continue;
      // Closest point of the tile to the circle centre.
      const cx = clamp(x, tx * 32, tx * 32 + 32);
      const cy = clamp(y, ty * 32, ty * 32 + 32);
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
  }
  return false;
}
