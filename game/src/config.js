// Tuning for Midnight at the Meridian Vault: every number the game balances on
// lives here, so a level or a mechanic can be retuned without touching logic.

export const TILE = 32
export const VIEW_W = 960
export const VIEW_H = 640

export const PLAYER = {
  radius: 11,
  walkSpeed: 148,
  sneakSpeed: 82,
  // A sneaking thief is harder to spot: guards and cameras see less far.
  sneakSpotFactor: 0.58,
}

export const GUARD = {
  radius: 12,
  patrolSpeed: 62,
  chaseSpeed: 108,
  investigateSpeed: 88,
  // How far a guard can see, in pixels, and how wide its cone is (half-angle).
  sightRange: 178,
  halfAngle: Math.PI / 5.2,
  // Seconds a guard keeps chasing after losing sight of the thief.
  loseSightAfter: 2.0,
  // Seconds a guard studies a thrown coin before going back to patrol.
  investigateTime: 2.2,
  // A guard that walks into the thief catches them.
  catchDistance: 26,
}

export const CAMERA = {
  sightRange: 196,
  halfAngle: Math.PI / 6,
  // Radians per second the camera head sweeps.
  sweepSpeed: 0.55,
}

export const LASER = {
  // Seconds a laser beam stays on, then off, in one cycle.
  onTime: 1.25,
  offTime: 0.85,
}

export const COIN = {
  startCount: 3,
  // Guards closer than this (pixels) to a landed coin go to investigate it.
  hearRadius: 210,
  flightTime: 0.38,
  lingerTime: 6,
}

export const ALARM = {
  max: 100,
  // Alarm points per second while a guard has the thief in its cone.
  guardRate: 46,
  cameraRate: 30,
  laserRate: 55,
  // Alarm points per second the meter cools down while nobody sees the thief.
  decayRate: 9,
  // Above this the guards run to the last place they saw the thief.
  suspiciousAt: 55,
}

export const LOOT_VALUE = {
  painting: 2400,
  vault: 8000,
  diamond: 50000,
}

export const COLORS = {
  floor: '#232030',
  floorAlt: '#262335',
  wall: '#17141f',
  wallTop: '#2e2844',
  crate: '#4a3a22',
  crateTop: '#6b5636',
  loot: '#f2c94c',
  vault: '#7fd4ff',
  diamond: '#9ef2ff',
  exit: '#58d68d',
  player: '#e8e2d0',
  guard: '#ff5d5d',
  camera: '#ff9f43',
  laser: '#ff2e63',
  coneGuard: 'rgba(255, 214, 90, 0.20)',
  coneGuardSeen: 'rgba(255, 70, 70, 0.30)',
  coneCamera: 'rgba(255, 159, 67, 0.16)',
  coneCameraSeen: 'rgba(255, 70, 70, 0.26)',
}
