// Tiny procedural sound: short oscillator blips, no audio files. The
// context is created on the first user gesture, so browsers allow it.
let ctx = null;
let alarmTimer = 0;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq, dur, type, gain, slideTo) {
  const c = ensure();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(gain || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  } catch {
    // Sound is garnish; a failure here never stops the game.
  }
}

// One short beep while the alarm runs hot, throttled by the caller.
export function alarmTick(alarm, dt) {
  if (alarm < 55) return;
  alarmTimer -= dt;
  if (alarmTimer > 0) return;
  alarmTimer = alarm > 85 ? 0.35 : 0.7;
  tone(620, 0.09, 'square', 0.03);
}

export function playEvent(type) {
  switch (type) {
    case 'pickup':
      tone(880, 0.08, 'sine', 0.07);
      setTimeout(() => tone(1320, 0.1, 'sine', 0.06), 60);
      break;
    case 'coin':
      tone(1500, 0.06, 'triangle', 0.06, 900);
      break;
    case 'star':
      tone(660, 0.12, 'sine', 0.08);
      setTimeout(() => tone(990, 0.12, 'sine', 0.08), 110);
      setTimeout(() => tone(1320, 0.22, 'sine', 0.08), 220);
      break;
    case 'vault':
      tone(220, 0.25, 'sawtooth', 0.05, 440);
      break;
    case 'spot':
      tone(196, 0.16, 'square', 0.07, 392);
      break;
    case 'caught':
      tone(392, 0.5, 'sawtooth', 0.09, 98);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.08), i * 120));
      break;
    default:
      break;
  }
}
