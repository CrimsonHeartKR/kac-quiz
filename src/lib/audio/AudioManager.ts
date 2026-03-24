/**
 * AudioManager — Web Audio API 기반 오디오 매니저 (싱글톤)
 *
 * - SFX(효과음)와 BGM(배경음) 분리 제어
 * - 브라우저 자동재생 정책 대응 (사용자 제스처 후 초기화)
 * - localStorage로 볼륨/뮤트 설정 영속화
 * - BGM 크로스페이드 지원
 */

import { synthesizeSfx, type SfxName } from './SoundSynthesizer'
import { synthesizeBgm, type BgmName } from './BgmSynthesizer'

const STORAGE_KEYS = {
  muted: 'kac_audio_muted',
  sfxVol: 'kac_audio_sfx_vol',
  bgmVol: 'kac_audio_bgm_vol',
} as const

export class AudioManager {
  private static instance: AudioManager | null = null

  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmGain: GainNode | null = null

  private isMuted = false
  private sfxVolume = 0.7
  private bgmVolume = 0.4

  private currentBgmSource: AudioBufferSourceNode | null = null
  private currentBgmName: BgmName | null = null
  private bgmBufferCache = new Map<BgmName, AudioBuffer>()
  private sfxBufferCache = new Map<SfxName, AudioBuffer>()

  private initialized = false

  private constructor() {
    this.loadSettings()
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  /** 사용자 제스처 시 호출 — AudioContext 초기화/resume */
  async ensureContext(): Promise<void> {
    if (this.initialized && this.ctx?.state === 'running') return

    try {
      if (!this.ctx) {
        this.ctx = new AudioContext()
        this.masterGain = this.ctx.createGain()
        this.sfxGain = this.ctx.createGain()
        this.bgmGain = this.ctx.createGain()

        this.sfxGain.connect(this.masterGain)
        this.bgmGain.connect(this.masterGain)
        this.masterGain.connect(this.ctx.destination)

        this.applyVolumes()
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume()
      }

      this.initialized = true
    } catch {
      // AudioContext not supported
    }
  }

  /* ── SFX ── */

  playSfx(name: SfxName): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return

    const play = (buffer: AudioBuffer) => {
      const source = this.ctx!.createBufferSource()
      source.buffer = buffer
      source.connect(this.sfxGain!)
      source.start()
    }

    const cached = this.sfxBufferCache.get(name)
    if (cached) {
      play(cached)
      return
    }

    try {
      const buffer = synthesizeSfx(this.ctx, name)
      this.sfxBufferCache.set(name, buffer)
      play(buffer)
    } catch {
      // synthesis failed
    }
  }

  /* ── BGM ── */

  async playBgm(name: BgmName): Promise<void> {
    if (!this.ctx || !this.bgmGain) return
    if (this.currentBgmName === name && this.currentBgmSource) return

    // Fade out current BGM
    if (this.currentBgmSource) {
      await this.fadeOutBgm(300)
    }

    try {
      let buffer = this.bgmBufferCache.get(name)
      if (!buffer) {
        buffer = synthesizeBgm(this.ctx, name)
        this.bgmBufferCache.set(name, buffer)
      }

      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.connect(this.bgmGain)
      source.start()

      this.currentBgmSource = source
      this.currentBgmName = name

      source.onended = () => {
        if (this.currentBgmSource === source) {
          this.currentBgmSource = null
          this.currentBgmName = null
        }
      }
    } catch {
      // synthesis failed
    }
  }

  stopBgm(): void {
    this.fadeOutBgm(500)
  }

  private fadeOutBgm(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentBgmSource || !this.bgmGain || !this.ctx) {
        this.currentBgmSource = null
        this.currentBgmName = null
        resolve()
        return
      }

      const gain = this.bgmGain.gain
      const now = this.ctx.currentTime
      gain.setValueAtTime(gain.value, now)
      gain.linearRampToValueAtTime(0, now + durationMs / 1000)

      const source = this.currentBgmSource
      setTimeout(() => {
        try { source.stop() } catch { /* already stopped */ }
        this.currentBgmSource = null
        this.currentBgmName = null
        // Restore gain for next BGM
        if (this.bgmGain) {
          this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx!.currentTime)
        }
        resolve()
      }, durationMs)
    })
  }

  /* ── Volume Controls ── */

  setMasterMute(muted: boolean): void {
    this.isMuted = muted
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime)
    }
    this.saveSettings()
  }

  toggleMute(): boolean {
    this.setMasterMute(!this.isMuted)
    return this.isMuted
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol))
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime)
    }
    this.saveSettings()
  }

  setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol))
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime)
    }
    this.saveSettings()
  }

  getMasterMute(): boolean { return this.isMuted }
  getSfxVolume(): number { return this.sfxVolume }
  getBgmVolume(): number { return this.bgmVolume }

  /* ── Internal ── */

  private applyVolumes(): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.masterGain?.gain.setValueAtTime(this.isMuted ? 0 : 1, now)
    this.sfxGain?.gain.setValueAtTime(this.sfxVolume, now)
    this.bgmGain?.gain.setValueAtTime(this.bgmVolume, now)
  }

  private loadSettings(): void {
    try {
      const muted = localStorage.getItem(STORAGE_KEYS.muted)
      const sfx = localStorage.getItem(STORAGE_KEYS.sfxVol)
      const bgm = localStorage.getItem(STORAGE_KEYS.bgmVol)
      if (muted !== null) this.isMuted = muted === 'true'
      if (sfx !== null) this.sfxVolume = parseFloat(sfx)
      if (bgm !== null) this.bgmVolume = parseFloat(bgm)
    } catch { /* localStorage not available */ }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.muted, String(this.isMuted))
      localStorage.setItem(STORAGE_KEYS.sfxVol, String(this.sfxVolume))
      localStorage.setItem(STORAGE_KEYS.bgmVol, String(this.bgmVolume))
    } catch { /* localStorage not available */ }
  }
}
