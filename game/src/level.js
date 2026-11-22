// The Halcyon Gallery floor plan and every entity placed on it.
// '#' wall, '.' floor, 'S' shadow floor (slow detection), 'V' vault door,
// 'E' exit. Entities (guards, cameras, loot) are placed by tile coords.
import { CONFIG } from './config.js';

const T = CONFIG.tile;

export const MAP = [
  '##############################',
  '#..........#......#..........#',
  '#..........#......#..........#',
  '#..........#......#..........#',
  '#..........#......#..........#',
  '#..........###V####..........#',
  '#######.######.########.######',
  '#............................#',
  '#...SSS......................#',
  '#.........#........#.........#',
  '#............................#',
  '#.....................SSSS...#',
  '#............................#',
  '#######.#######.#######.######',
  '#............................#',
  '#...........SSSS.............#',
  '#............................#',
  '#............................#',
  '#..............E.............#',
  '##############################',
];

// Tile helpers. Coordinates are in tile units; px helpers convert.
export function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= CONFIG.cols || ty >= CONFIG.rows) return '#';
  return MAP[ty][tx];
}

export function isWall(tx, ty) {
  const t = tileAt(tx, ty);
  return t === '#' || t === 'V';
}

export function isShadow(tx, ty) {
  return tileAt(tx, ty) === 'S';
}

export function tileCenter(tx, ty) {
  return { x: tx * T + T / 2, y: ty * T + T / 2 };
}

// The vault door tile and the exit tile, as pixel centres.
export const VAULT_DOOR = tileCenter(14, 5);
export const EXIT = tileCenter(15, 18);
export const THIEF_START = tileCenter(15, 17);
export const STAR_POS = tileCenter(14, 2);

// Loot: coins, framed paintings and the Star of Halcyon itself.
export function freshLoot() {
  const coins = [
    [5, 8], [24, 8], [10, 10], [19, 10],
    [8, 15], [21, 15], [14, 9], [15, 11],
  ].map(([tx, ty]) => {
    const p = tileCenter(tx, ty);
    return { kind: 'coin', x: p.x, y: p.y, value: CONFIG.lootCoin, taken: false };
  });
  const paintings = [
    [2, 2], [27, 2], [2, 12], [27, 12],
  ].map(([tx, ty]) => {
    const p = tileCenter(tx, ty);
    return { kind: 'painting', x: p.x, y: p.y, value: CONFIG.lootPainting, taken: false };
  });
  const star = {
    kind: 'star', x: STAR_POS.x, y: STAR_POS.y,
    value: CONFIG.lootStar, taken: false,
  };
  return [...coins, ...paintings, star];
}

// Guards patrol between waypoints (tile coords). Facing follows movement.
export function freshGuards() {
  const defs = [
    { name: 'Mara', path: [[3, 3], [9, 3]], phase: 0 },
    { name: 'Ivo', path: [[20, 3], [26, 3]], phase: 0.5 },
    { name: 'Kess', path: [[5, 10], [24, 10]], phase: 0.25 },
    { name: 'Bram', path: [[8, 16], [22, 16]], phase: 0.75 },
  ];
  return defs.map((d) => {
    const [sx, sy] = d.path[0];
    const p = tileCenter(sx, sy);
    const [nx, ny] = d.path[1];
    const q = tileCenter(nx, ny);
    return {
      name: d.name,
      x: p.x,
      y: p.y,
      angle: Math.atan2(q.y - p.y, q.x - p.x),
      path: d.path.map(([tx, ty]) => tileCenter(tx, ty)),
      leg: 0,
      wait: 0,
      alert: 0,
      state: 'patrol', // patrol | investigate | chase
      target: null,
      phase: d.phase,
    };
  });
}

// Wall-mounted cameras sweep a cone across the gallery.
export function freshCameras() {
  return [
    {
      name: 'Cam A',
      ...tileCenter(13, 6),
      baseAngle: Math.PI / 2, // looking down into the gallery
      angle: Math.PI / 2,
      sweepT: 0,
      seeing: false,
    },
    {
      name: 'Cam B',
      ...tileCenter(16, 13),
      baseAngle: -Math.PI / 2, // looking up into the gallery
      angle: -Math.PI / 2,
      sweepT: Math.PI,
      seeing: false,
    },
  ];
}
