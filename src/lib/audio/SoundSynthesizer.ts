/**
 * SoundSynthesizer — Web Audio API 기반 효과음 합성
 *
 * MP3 파일 없이 OscillatorNode로 실시간 생성.
 * 각 효과음은 AudioBuffer로 반환되어 AudioManager에서 캐싱.
 */

export type SfxName =
  | 'buttonClick'
  | 'countdownTick'
  | 'countdownFinal'
  | 'correctAnswer'
  | 'incorrectAnswer'
  | 'rankingReveal'
  | 'timerWarning'
  | 'celebrate'

export function synthesizeSfx(ctx: AudioContext, name: SfxName): AudioBuffer {
  switch (name) {
    case 'buttonClick': return createButtonClick(ctx)
    case 'countdownTick': return createCountdownTick(ctx)
    case 'countdownFinal': return createCountdownFinal(ctx)
    case 'correctAnswer': return createCorrectAnswer(ctx)
    case 'incorrectAnswer': return createIncorrectAnswer(ctx)
    case 'rankingReveal': return createRankingReveal(ctx)
    case 'timerWarning': return createTimerWarning(ctx)
    case 'celebrate': return createCelebrate(ctx)
  }
}

/* ── Utility: render oscillator sequence to buffer ── */

interface ToneSpec {
  freq: number
  startTime: number
  duration: number
  type?: OscillatorType
  gainStart?: number
  gainEnd?: number
}

function renderTones(ctx: AudioContext, tones: ToneSpec[], totalDuration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = Math.ceil(totalDuration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (const tone of tones) {
    const start = Math.floor(tone.startTime * sampleRate)
    const dur = Math.floor(tone.duration * sampleRate)
    const gainStart = tone.gainStart ?? 0.3
    const gainEnd = tone.gainEnd ?? 0
    const type = tone.type ?? 'sine'

    for (let i = 0; i < dur && (start + i) < length; i++) {
      const t = i / sampleRate
      const envelope = gainStart + (gainEnd - gainStart) * (i / dur)

      let sample: number
      const phase = (2 * Math.PI * tone.freq * t)

      switch (type) {
        case 'sine':
          sample = Math.sin(phase)
          break
        case 'square':
          sample = Math.sin(phase) > 0 ? 1 : -1
          break
        case 'sawtooth':
          sample = 2 * ((tone.freq * t) % 1) - 1
          break
        case 'triangle':
          sample = 2 * Math.abs(2 * ((tone.freq * t) % 1) - 1) - 1
          break
        default:
          sample = Math.sin(phase)
      }

      data[start + i] += sample * envelope
    }
  }

  // Clamp
  for (let i = 0; i < length; i++) {
    data[i] = Math.max(-1, Math.min(1, data[i]))
  }

  return buffer
}

/* ── Sound Definitions ── */

/** 버튼 클릭 — 짧은 800Hz sine, 50ms */
function createButtonClick(ctx: AudioContext): AudioBuffer {
  return renderTones(ctx, [
    { freq: 800, startTime: 0, duration: 0.05, type: 'sine', gainStart: 0.2, gainEnd: 0 },
  ], 0.06)
}

/** 카운트다운 틱 — 600Hz square, 80ms */
function createCountdownTick(ctx: AudioContext): AudioBuffer {
  return renderTones(ctx, [
    { freq: 600, startTime: 0, duration: 0.08, type: 'square', gainStart: 0.15, gainEnd: 0 },
  ], 0.1)
}

/** 카운트다운 최종 — 400→200Hz sweep, 200ms */
function createCountdownFinal(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const duration = 0.25
  const length = Math.ceil(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const progress = i / length
    const freq = 400 - 200 * progress
    const envelope = 0.25 * (1 - progress)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope
  }

  return buffer
}

/** 정답 — C-E-G 아르페지오 상승 */
function createCorrectAnswer(ctx: AudioContext): AudioBuffer {
  return renderTones(ctx, [
    { freq: 523.25, startTime: 0, duration: 0.12, type: 'sine', gainStart: 0.25, gainEnd: 0.1 },
    { freq: 659.25, startTime: 0.1, duration: 0.12, type: 'sine', gainStart: 0.25, gainEnd: 0.1 },
    { freq: 783.99, startTime: 0.2, duration: 0.2, type: 'sine', gainStart: 0.3, gainEnd: 0 },
    // Octave accent
    { freq: 1046.5, startTime: 0.3, duration: 0.15, type: 'sine', gainStart: 0.15, gainEnd: 0 },
  ], 0.5)
}

/** 오답 — B♭→E♭ 하강 */
function createIncorrectAnswer(ctx: AudioContext): AudioBuffer {
  return renderTones(ctx, [
    { freq: 466.16, startTime: 0, duration: 0.15, type: 'sawtooth', gainStart: 0.15, gainEnd: 0.05 },
    { freq: 311.13, startTime: 0.12, duration: 0.2, type: 'sawtooth', gainStart: 0.15, gainEnd: 0 },
  ], 0.35)
}

/** 랭킹 공개 — 드럼롤 시뮬레이션 */
function createRankingReveal(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const duration = 0.8
  const length = Math.ceil(duration * sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const progress = i / length
    // Noise with rapid amplitude modulation
    const noise = (Math.random() * 2 - 1)
    const rollSpeed = 20 + 40 * progress // accelerating
    const modulation = Math.abs(Math.sin(2 * Math.PI * rollSpeed * t))
    const envelope = 0.15 * (0.3 + 0.7 * progress) * modulation
    data[i] = noise * envelope
  }

  return buffer
}

/** 타이머 경고 — 고음 비프 */
function createTimerWarning(ctx: AudioContext): AudioBuffer {
  return renderTones(ctx, [
    { freq: 1000, startTime: 0, duration: 0.08, type: 'square', gainStart: 0.15, gainEnd: 0 },
    { freq: 1000, startTime: 0.15, duration: 0.08, type: 'square', gainStart: 0.15, gainEnd: 0 },
  ], 0.25)
}

/** 축하 — 다중톤 팡파레 */
function createCelebrate(ctx: AudioContext): AudioBuffer {
  return renderTones(ctx, [
    // Fanfare chord: C-E-G-C
    { freq: 523.25, startTime: 0, duration: 0.15, type: 'sine', gainStart: 0.2, gainEnd: 0.1 },
    { freq: 659.25, startTime: 0, duration: 0.15, type: 'sine', gainStart: 0.15, gainEnd: 0.08 },
    { freq: 783.99, startTime: 0.05, duration: 0.15, type: 'sine', gainStart: 0.2, gainEnd: 0.1 },
    // Rising arpeggio
    { freq: 783.99, startTime: 0.15, duration: 0.1, type: 'sine', gainStart: 0.2, gainEnd: 0.1 },
    { freq: 987.77, startTime: 0.22, duration: 0.1, type: 'sine', gainStart: 0.2, gainEnd: 0.1 },
    { freq: 1046.5, startTime: 0.3, duration: 0.25, type: 'sine', gainStart: 0.25, gainEnd: 0 },
    // Sparkle
    { freq: 2093, startTime: 0.35, duration: 0.1, type: 'sine', gainStart: 0.08, gainEnd: 0 },
    { freq: 2637, startTime: 0.4, duration: 0.08, type: 'sine', gainStart: 0.05, gainEnd: 0 },
  ], 0.55)
}
