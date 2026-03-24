import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
// @ts-expect-error — react-qr-code export mismatch
import { QRCode } from 'react-qr-code'
import { useQuizSession } from '../hooks/useQuizSession'
import { useTheme } from '../lib/theme'
import { useAudio } from '../hooks/useAudio'
import AudioControls from '../components/AudioControls'

export default function HostLobbyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sessionId') || searchParams.get('session') || ''
  const { session, participants, advancePhase } = useQuizSession({ sessionId })

  const theme = useTheme(session?.quiz_set_id)
  const { playSfx } = useAudio()

  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)

  const pin = session?.pin || ''
  const joinUrl = `${window.location.origin}/?pin=${pin}`
  const canStart = participants.length > 0 && !starting

  useEffect(() => {
    if (session?.phase === 'play' || session?.phase === 'ready') {
      navigate(`/host/play?session=${session.id}`)
    }
  }, [session?.phase, session?.id, navigate])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleStart = async () => {
    if (!canStart) return
    playSfx('buttonClick')
    setStarting(true)
    try {
      await advancePhase('play')
    } catch {
      setStarting(false)
    }
  }

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

  const avatarColors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
    '#F97316', '#EAB308', '#22C55E', '#14B8A6',
    '#06B6D4', '#3B82F6', '#A855F7', '#E11D48',
  ]

  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length]

  if (!session) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-gray-500 text-lg">세션을 불러오는 중...</span>
        </div>
      </div>
    )
  }

  const lobbyBgImage = theme.bgImageWait || theme.bgImageProjector || null

  return (
    <>
      <div className="fixed inset-0 bg-white flex">
        {/* ══ LEFT: QR Code Panel ══ */}
        <div className="w-[480px] shrink-0 flex flex-col" style={{ backgroundColor: theme.bgColor }}>
          {/* QR Code area */}
          <div className="flex-1 flex flex-col items-center justify-center px-10">
            {/* QR Code */}
            <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
              <QRCode value={joinUrl} size={360} level="M" bgColor="#FFFFFF" fgColor={theme.bgColor} />
            </div>

            {/* 참가 코드 label */}
            <p className="text-gray-400 text-sm tracking-widest uppercase mb-4">참가 코드</p>

            {/* PIN digits */}
            <div className="flex gap-3 mb-8">
              {pin.split('').map((digit, i) => (
                <div key={i}
                  className="w-20 h-24 flex items-center justify-center rounded-xl accent-text"
                  style={{
                    backgroundColor: `${theme.accentColor}14`,
                    border: `1px solid ${theme.accentColor}33`,
                    fontFamily: "var(--font-title), cursive",
                    fontSize: '56px',
                    lineHeight: 1,
                  }}>
                  {digit}
                </div>
              ))}
            </div>

            {/* 링크 복사 */}
            <div className="w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-500 text-xs">또는 링크로 참가</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: copied ? '#10B981' : '#D1D5DB',
                }}>
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    복사 완료!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    참가 링크 복사
                  </>
                )}
              </button>
            </div>

            <p className="text-gray-600 text-xs mt-5 text-center leading-relaxed">
              참가자들이 QR코드를 스캔하거나<br />
              PIN 코드를 입력하여 참가할 수 있습니다
            </p>
          </div>
        </div>

        {/* ══ RIGHT: Participant list + Start button ══ */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* 참가자 목록 영역 (배경 이미지 교체 가능) */}
          <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: lobbyBgImage ? undefined : '#1a3a4a' }}>
            {/* Background image layer */}
            {lobbyBgImage && (
              <>
                <img src={lobbyBgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30" />
              </>
            )}

            <div className="relative z-10 h-full flex flex-col" style={{ padding: '32px' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <h2 className="text-white text-3xl font-bold">참가자 목록</h2>
                  <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/15 backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-white text-xl font-bold">{participants.length}명</span>
                  </div>
                </div>
                {participants.length > 0 && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    실시간 업데이트
                  </div>
                )}
              </div>

              {/* Participant list or empty state */}
              <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {participants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <svg className="w-20 h-20 text-white/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <p className="text-white/50 text-lg font-medium">아직 참가자가 없습니다</p>
                    <p className="text-white/30 text-sm mt-1">QR코드를 스캔하거나 PIN을 입력하여 참가하세요</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {participants.map((p, idx) => (
                      <div key={p.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 participant-card"
                        style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-lg"
                          style={{ backgroundColor: getAvatarColor(idx) }}>
                          {getInitials(p.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-base font-medium truncate">{p.name}</p>
                          <p className="text-white/50 text-sm truncate">{p.class_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 퀴즈 시작 버튼 */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="shrink-0 w-full py-8 text-white text-3xl font-extrabold tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-125 enabled:active:scale-[0.99]"
            style={{ backgroundColor: canStart ? '#DC2626' : '#999', boxShadow: canStart ? '0 -4px 20px rgba(220,38,38,0.3)' : 'none' }}>
            {starting ? (
              <span className="inline-flex items-center gap-3">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                시작하는 중...
              </span>
            ) : (
              '퀴즈 시작'
            )}
          </button>
        </div>
      </div>
      <AudioControls />
    </>
  )
}

/* CSS animations are in src/styles/animations.css */
