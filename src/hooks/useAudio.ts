/**
 * useAudio — React hook for AudioManager
 *
 * 첫 렌더링 시 document 클릭 리스너로 AudioContext 초기화.
 * 모든 페이지에서 동일한 싱글톤 AudioManager 사용.
 */

import { useCallback, useEffect, useState } from 'react'
import { AudioManager } from '../lib/audio/AudioManager'
import type { SfxName } from '../lib/audio/SoundSynthesizer'
import type { BgmName } from '../lib/audio/BgmSynthesizer'

export function useAudio() {
  const [isMuted, setIsMuted] = useState(() => AudioManager.getInstance().getMasterMute())
  const [sfxVolume, setSfxVolumeState] = useState(() => AudioManager.getInstance().getSfxVolume())
  const [bgmVolume, setBgmVolumeState] = useState(() => AudioManager.getInstance().getBgmVolume())

  // 사용자 첫 인터랙션 시 AudioContext 초기화
  useEffect(() => {
    const manager = AudioManager.getInstance()

    const handleInteraction = () => {
      manager.ensureContext()
    }

    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })
    document.addEventListener('keydown', handleInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  const playSfx = useCallback((name: SfxName) => {
    const manager = AudioManager.getInstance()
    manager.ensureContext()
    manager.playSfx(name)
  }, [])

  const playBgm = useCallback((name: BgmName) => {
    const manager = AudioManager.getInstance()
    manager.ensureContext()
    manager.playBgm(name)
  }, [])

  const stopBgm = useCallback(() => {
    AudioManager.getInstance().stopBgm()
  }, [])

  const toggleMute = useCallback(() => {
    const manager = AudioManager.getInstance()
    const muted = manager.toggleMute()
    setIsMuted(muted)
  }, [])

  const setSfxVolume = useCallback((vol: number) => {
    AudioManager.getInstance().setSfxVolume(vol)
    setSfxVolumeState(vol)
  }, [])

  const setBgmVolume = useCallback((vol: number) => {
    AudioManager.getInstance().setBgmVolume(vol)
    setBgmVolumeState(vol)
  }, [])

  return {
    playSfx,
    playBgm,
    stopBgm,
    isMuted,
    toggleMute,
    sfxVolume,
    setSfxVolume,
    bgmVolume,
    setBgmVolume,
  }
}
