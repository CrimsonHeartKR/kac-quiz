/**
 * BgmSynthesizer — Web Audio API 기반 BGM 합성
 *
 * 4~8초 루프 버퍼를 오실레이터 레이어링으로 생성.
 * MP3 불필요 — 순수 사인파 패드 + LFO로 앰비언트 사운드 생성.
 */

export type BgmName = 'lobby' | 'play' | 'result'

export function synthesizeBgm(ctx: AudioContext, name: BgmName): AudioBuffer {
  switch (name) {
    case 'lobby': return createLobbyBgm(ctx)
    case 'play': return createPlayBgm(ctx)
    case 'result': return createResultBgm(ctx)
  }
}

/* ── Utility ── */

function addTone(
  data: Float32Array,
  sampleRate: number,
  freq: number,
  gain: number,
  lfoFreq = 0,
  lfoDepth = 0,
): void {
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    const lfo = lfoFreq > 0 ? 1 + lfoDepth * Math.sin(2 * Math.PI * lfoFreq * t) : 1
    data[i] += Math.sin(2 * Math.PI * freq * t) * gain * lfo
  }
}

function applyFades(data: Float32Array, sampleRate: number, fadeMs: number): void {
  const fadeSamples = Math.floor(fadeMs / 1000 * sampleRate)
  // Crossfade for seamless loop: blend end into beginning
  for (let i = 0; i < fadeSamples && i < data.length; i++) {
    const t = i / fadeSamples
    // Fade in at start
    data[i] *= t
    // Fade out at end
    const endIdx = data.length - 1 - i
    if (endIdx >= 0) {
      data[endIdx] *= t
    }
  }
}

function clampBuffer(data: Float32Array): void {
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.max(-1, Math.min(1, data[i]))
  }
}

/* ── BGM Definitions ── */

/** 로비 — C Major 7 사인 패드, 느린 LFO */
function createLobbyBgm(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const duration = 6 // 6초 루프
  const length = Math.ceil(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // C Major 7 chord: C3-E3-G3-B3
  addTone(data, sampleRate, 130.81, 0.08, 0.15, 0.3) // C3
  addTone(data, sampleRate, 164.81, 0.06, 0.12, 0.25) // E3
  addTone(data, sampleRate, 196.00, 0.06, 0.18, 0.2) // G3
  addTone(data, sampleRate, 246.94, 0.04, 0.1, 0.3) // B3

  // Sub bass
  addTone(data, sampleRate, 65.41, 0.05, 0.08, 0.4) // C2

  // High shimmer
  addTone(data, sampleRate, 523.25, 0.015, 0.2, 0.5) // C5

  applyFades(data, sampleRate, 200)
  clampBuffer(data)

  return buffer
}

/** 플레이 — A minor 텐션 패드, 미묘한 리듬 펄스 */
function createPlayBgm(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const duration = 4 // 4초 루프 (빠른 템포감)
  const length = Math.ceil(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // A minor chord: A2-C3-E3
  addTone(data, sampleRate, 110.00, 0.07, 0.2, 0.2) // A2
  addTone(data, sampleRate, 130.81, 0.05, 0.15, 0.25) // C3
  addTone(data, sampleRate, 164.81, 0.05, 0.25, 0.2) // E3

  // Tension: add D3 (sus4 feel)
  addTone(data, sampleRate, 146.83, 0.03, 0.3, 0.3) // D3

  // Sub pulse
  addTone(data, sampleRate, 55.00, 0.04, 0.5, 0.6) // A1 with strong LFO = rhythmic pulse

  applyFades(data, sampleRate, 150)
  clampBuffer(data)

  return buffer
}

/** 결과 — F Major 브라이트, 느린 아르페지오 패턴 */
function createResultBgm(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const duration = 8 // 8초 루프 (여유로운 분위기)
  const length = Math.ceil(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // F Major chord: F3-A3-C4
  addTone(data, sampleRate, 174.61, 0.06, 0.1, 0.3) // F3
  addTone(data, sampleRate, 220.00, 0.05, 0.08, 0.25) // A3
  addTone(data, sampleRate, 261.63, 0.05, 0.12, 0.2) // C4

  // Arpeggio-like motion using phased LFOs
  addTone(data, sampleRate, 349.23, 0.025, 0.15, 0.6) // F4 (pulsing in/out)
  addTone(data, sampleRate, 440.00, 0.02, 0.22, 0.5) // A4

  // Warm sub
  addTone(data, sampleRate, 87.31, 0.04, 0.06, 0.3) // F2

  applyFades(data, sampleRate, 300)
  clampBuffer(data)

  return buffer
}
