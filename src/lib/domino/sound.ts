/**
 * Dominó Clásico — Efectos de sonido sintetizados con WebAudio (sin archivos).
 * El AudioContext se crea perezosamente tras el primer gesto del usuario.
 */

let ctx: AudioContext | null = null
let enabled = true

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(v: boolean) {
  enabled = v
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, freqEnd?: number) {
  const c = getCtx()
  if (!c || !enabled) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noise(dur: number, gain: number, delay = 0, filterFreq = 1200) {
  const c = getCtx()
  if (!c || !enabled) return
  const t0 = c.currentTime + delay
  const frames = Math.floor(c.sampleRate * dur)
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterFreq
  const g = c.createGain()
  g.gain.value = gain
  src.connect(filter)
  filter.connect(g)
  g.connect(c.destination)
  src.start(t0)
}

/** Golpe seco de ficha sobre la mesa. */
export const sfxPlace = () => {
  noise(0.06, 0.5, 0, 900)
  tone(190, 0.09, 'triangle', 0.35, 0, 120)
  tone(950, 0.03, 'square', 0.06, 0.01)
}

/** Ficha robada del montón. */
export const sfxDraw = () => {
  noise(0.14, 0.22, 0, 2600)
  tone(420, 0.08, 'sine', 0.1, 0, 620)
}

/** Toque suave de interacción (seleccionar ficha). */
export const sfxClick = () => tone(600, 0.04, 'sine', 0.12, 0, 750)

/** Turno pasado. */
export const sfxPass = () => {
  tone(160, 0.16, 'sine', 0.2, 0, 110)
  noise(0.1, 0.12, 0.02, 500)
}

/** Barajado al repartir. */
export const sfxShuffle = () => {
  for (let i = 0; i < 6; i++) noise(0.05, 0.18, i * 0.09, 1600)
}

/** Fin de ronda ganado. */
export const sfxRoundWin = () => {
  ;[523, 659, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.22, i * 0.11))
  tone(1046, 0.3, 'triangle', 0.18, 0.33)
}

/** Fin de ronda perdido. */
export const sfxRoundLose = () => {
  ;[392, 330, 262].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, i * 0.13))
}

/** Victoria final. */
export const sfxWin = () => {
  const notes = [523, 659, 784, 1046, 784, 1046, 1318]
  notes.forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, i * 0.13))
  noise(0.5, 0.08, 0.1, 4000)
}
