/**
 * AudioControls — 뮤트/볼륨 컨트롤 위젯
 *
 * 운영자/프로젝터 화면 우하단에 표시.
 * 글래스모피즘 스타일, 클릭 시 확장.
 */

import { useState } from 'react'
import { useAudio } from '../hooks/useAudio'

export default function AudioControls() {
  const { isMuted, toggleMute, sfxVolume, setSfxVolume, bgmVolume, setBgmVolume } = useAudio()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {expanded && (
        <div
          className="glass-card-strong p-4 rounded-xl w-56 anim-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-white/70 text-xs font-medium mb-3 uppercase tracking-wider">오디오 설정</p>

          {/* SFX Volume */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-xs">효과음</span>
              <span className="text-white/40 text-xs">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--accent) ${sfxVolume * 100}%, rgba(255,255,255,0.15) ${sfxVolume * 100}%)`,
              }}
            />
          </div>

          {/* BGM Volume */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-xs">배경음</span>
              <span className="text-white/40 text-xs">{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgmVolume}
              onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--accent) ${bgmVolume * 100}%, rgba(255,255,255,0.15) ${bgmVolume * 100}%)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => {
          if (expanded) {
            setExpanded(false)
          } else {
            toggleMute()
          }
        }}
        onDoubleClick={() => setExpanded(!expanded)}
        title={expanded ? '닫기' : (isMuted ? '음소거 해제 (더블클릭: 설정)' : '음소거 (더블클릭: 설정)')}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {isMuted ? (
          <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>
    </div>
  )
}
