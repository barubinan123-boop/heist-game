// Tuning constants for Sable & Smoke. One place for every number the
// other modules share, so the game can be balanced without hunting.
export const CONFIG = {
  tile: 32,
  cols: 30,
  rows: 20,
  viewW: 960,
  viewH: 640,

  thiefRadius: 11,
  thiefSpeed: 148,
  thiefSneakSpeed: 82,

  guardRadius: 12,
  guardPatrolSpeed: 62,
  guardChaseSpeed: 128,
  guardInvestigateSpeed: 96,
  guardViewRange: 205,
  guardViewHalfAngle: 0.66, // ~38 degrees each side
  guardCatchRange: 20,

  cameraRange: 235,
  cameraHalfAngle: 0.55, // ~31 degrees each side
  cameraSweep: 0.96, // radians each side of the base angle
  cameraSweepSpeed: 0.55, // radians per second

  // Alertness / alarm rates, per second.
  guardSpotRate: 58,
  guardSpotCloseBonus: 34, // extra when the thief is within 100px
  guardCalmRate: 26,
  chaseAlarmRate: 12,
  cameraAlarmRate: 21,
  alarmDecayRate: 4.5,
  alarmLockdown: 100,

  // Shadow floor and sneaking multiply how fast a guard spots the thief.
  shadowSpotFactor: 0.5,
  sneakSpotFactor: 0.55,

  vaultHackSeconds: 2.0,
  coinThrowCount: 3,
  coinThrowRange: 230,
  coinLureRadius: 170,

  lootCoin: 50,
  lootPainting: 200,
  lootStar: 1000,

  // Palette: a dark gallery at night, warm gold loot, red danger.
  colors: {
    floorA: '#20242e',
    floorB: '#232833',
    floorShadow: '#171a21',
    wall: '#3a4152',
    wallTop: '#4d5870',
    vaultFloor: '#2b2430',
    gold: '#f2c14e',
    goldDark: '#b98a2e',
    alarmGreen: '#58c98a',
    alarmAmber: '#f2b14e',
    alarmRed: '#ef4b4b',
    cone: 'rgba(242, 177, 78, 0.20)',
    coneHot: 'rgba(239, 75, 75, 0.30)',
    cameraCone: 'rgba(86, 178, 242, 0.16)',
    thief: '#e8e4d8',
    thiefCoat: '#23202b',
    guard: '#c94f4f',
    guardDark: '#7e2f2f',
    exit: '#58c98a',
  },
};
