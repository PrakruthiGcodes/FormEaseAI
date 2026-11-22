// Gentle Web Audio API earcon sound chimes for accessibility.
// Synthesizes pleasant acoustic cues for blind, illiterate, and hands-free users.
// Zero external audio files; fails completely silently if AudioContext is unavailable.

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Play a soft rising cue when voice listening begins.
 */
export function playListenStart() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now) // A4
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.14) // E5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.17)
  } catch {
    // Fail silently on restricted or blocked audio
  }
}

/**
 * Play a gentle double-ping confirmation when speech is captured.
 */
export function playSpeechCaptured() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(880, now + 0.06) // A5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.14, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.16)
  } catch {
    // Fail silently
  }
}

/**
 * Play a pleasant 3-note harmonic arpeggio when a form field is successfully saved.
 */
export function playSaved() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5 major triad

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.07

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.17)
    })
  } catch {
    // Fail silently
  }
}

/**
 * Play a soft low descending cue when speech is missed or needs correction.
 */
export function playError() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(329.63, now) // E4
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18) // A3

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.23)
  } catch {
    // Fail silently
  }
}
