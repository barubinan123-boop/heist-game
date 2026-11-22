// Sound, synthesized live with WebAudio — no audio files, no network. A
// soft footstep tick, a coin clink, a loot chime, an alarm sting when a guard
// spots the thief, and a short fanfare for the getaway. Nothing plays until
// the player first presses a key or clicks, which is also when browsers allow
// audio to start.

let ctx = null
let muted = false

function ensure() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      ctx = null
    }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function unlockAudio() {
  ensure()
}

export function toggleMute() {
  muted = !muted
  return muted
}

export function isMuted() {
  return muted
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return
  const ac = ensure()
  if (!ac) return
  const t0 = ac.currentTime + when
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

export const sfx = {
  step() { tone(190 + Math.random() * 40, 0.05, 'triangle', 0.03) },
  coin() { tone(1320, 0.09, 'sine', 0.08); tone(1760, 0.12, 'sine', 0.06, 0.06) },
  loot() { tone(660, 0.1, 'sine', 0.09); tone(880, 0.1, 'sine', 0.09, 0.08); tone(1320, 0.18, 'sine', 0.08, 0.16) },
  spotted() { tone(220, 0.16, 'sawtooth', 0.07, 0, 440); tone(440, 0.16, 'sawtooth', 0.05, 0.14, 220) },
  caught() { tone(330, 0.5, 'sawtooth', 0.09, 0, 82) },
  alarmTick() { tone(980, 0.07, 'square', 0.035) },
  win() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, i * 0.12))
  },
  denied() { tone(160, 0.12, 'square', 0.05) },
}
