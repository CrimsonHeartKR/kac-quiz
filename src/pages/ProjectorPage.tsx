import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
// @ts-expect-error — react-qr-code export mismatch
import { QRCode } from 'react-qr-code'
import { useQuizSession } from '../hooks/useQuizSession'
import { supabase } from '../lib/supabase'
import { useTheme, getTimerColor, type ThemeConfig } from '../lib/theme'
import ThemedBackground from '../components/ThemedBackground'
import LottieAnimation from '../components/LottieAnimation'

/* ── Types ────────────────────────────────────────────────── */

interface Question {
  question_text: string
  image_url?: string | null
  question_type: 'text' | 'ox' | 'image'
  options: string[]
  option_images: (string | null)[]
  correct_index: number
  time_limit: number
}

/* ── Constants ────────────────────────────────────────────── */

const TIMER_RADIUS = 54
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS

/* ── CSS Animations ──────────────────────────────────────── */

/* ── CSS Animations are in src/styles/animations.css ───── */

/* ── Confetti Particles (pure CSS) ───────────────────────── */

function ConfettiParticles({ theme }: { theme: ThemeConfig }) {
  const particles = useMemo(() => {
    const colors = [
      theme.medalGold, theme.btnA, theme.correct, theme.primaryColor,
      theme.accentColor, theme.medalBronze, theme.btnC, theme.btnB,
    ]
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[i % colors.length],
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
      size: 6 + Math.random() * 8,
      type: i % 3, // 0=circle, 1=square, 2=star
    }))
  }, [theme])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.left,
            bottom: '20%',
            width: p.size,
            height: p.size,
            backgroundColor: p.type !== 2 ? p.color : 'transparent',
            borderRadius: p.type === 0 ? '50%' : p.type === 1 ? '2px' : 0,
            animation: `confettiFloat ${p.duration} ease-out ${p.delay} infinite`,
            ...(p.type === 2
              ? {
                  width: 0,
                  height: 0,
                  borderLeft: `${p.size / 2}px solid transparent`,
                  borderRight: `${p.size / 2}px solid transparent`,
                  borderBottom: `${p.size}px solid ${p.color}`,
                  backgroundColor: 'transparent',
                }
              : {}),
          }}
        />
      ))}
      {/* Star bursts */}
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={`star-${i}`}
          className="absolute"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 60}%`,
            fontSize: `${16 + Math.random() * 24}px`,
            color: theme.accentColor,
            animation: `starBurst ${2 + Math.random() * 2}s ease-out ${Math.random() * 4}s infinite`,
          }}
        >
          ★
        </div>
      ))}
      {/* Sparkles */}
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: 4,
            height: 4,
            backgroundColor: theme.medalGold,
            animation: `sparkle ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 3}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────── */

export default function ProjectorPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || undefined

  const { session, participants } = useQuizSession({ sessionId })
  const theme = useTheme(session?.quiz_set_id)

  const [questions, setQuestions] = useState<Question[]>([])
  const [remaining, setRemaining] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  // D4 award reveal state
  const [awardPhase, setAwardPhase] = useState(0) // 0=waiting, 1=3rd, 2=2nd, 3=1st
  const awardTimerRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const prevPhaseRef = useRef<string>('')

  // Previous rankings for rank change arrows (D3)
  const [prevRankMap, setPrevRankMap] = useState<Record<string, number>>({})
  const rankSnapshotRef = useRef<Record<string, number>>({})

  // Load questions
  useEffect(() => {
    if (!session?.quiz_set_id) return
    ;(async () => {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_set_id', session.quiz_set_id)
        .order('order_num', { ascending: true })
      if (data) {
        setQuestions(
          data.map((q: Record<string, unknown>) => ({
            question_text: (q.question_text as string) || '',
            image_url: (q.slide_image_url as string) || null,
            question_type: (q.question_type as 'text' | 'ox' | 'image') || 'text',
            options: (q.options as string[]) || [],
            option_images: (q.option_images as (string | null)[]) || [],
            correct_index: (q.correct_index as number) ?? 0,
            time_limit: (q.time_limit as number) || 20,
          }))
        )
      }
    })()
  }, [session?.quiz_set_id])

  // Timer sync (D2)
  useEffect(() => {
    if (!session || !questions.length) return
    const currentQ = session.current_question ?? 0
    const question = questions[currentQ]
    if (!question || session.phase !== 'play') {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const startedAt = session.question_started_at
    if (!startedAt) return
    startRef.current = new Date(startedAt).getTime()

    const tick = () => {
      const elapsed = (Date.now() - startRef.current) / 1000
      const left = Math.max(0, question.time_limit - elapsed)
      setRemaining(left)
      if (left > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [session?.phase, session?.current_question, session?.question_started_at, questions])

  // Snapshot rankings when entering 'rank' phase for prev comparison
  useEffect(() => {
    if (!session) return
    if (session.phase === 'play' && prevPhaseRef.current !== 'play') {
      // Entering play - snapshot current rankings
      const sorted = [...participants].sort((a, b) => b.score - a.score)
      const map: Record<string, number> = {}
      sorted.forEach((p, i) => {
        map[p.id] = i + 1
      })
      rankSnapshotRef.current = map
    }
    if (session.phase === 'rank' && prevPhaseRef.current !== 'rank') {
      setPrevRankMap(rankSnapshotRef.current)
    }
    prevPhaseRef.current = session.phase
  }, [session?.phase, participants])

  // D4 award reveal sequence
  useEffect(() => {
    if (session?.phase !== 'ended') {
      setAwardPhase(0)
      awardTimerRef.current.forEach(clearTimeout)
      awardTimerRef.current = []
      return
    }

    // 3-second delay, then reveal 3rd, 2nd, 1st
    const t1 = setTimeout(() => setAwardPhase(1), 3000)    // 3rd place
    const t2 = setTimeout(() => setAwardPhase(2), 5500)    // 2nd place
    const t3 = setTimeout(() => setAwardPhase(3), 8000)    // 1st place
    awardTimerRef.current = [t1, t2, t3]

    return () => {
      awardTimerRef.current.forEach(clearTimeout)
    }
  }, [session?.phase])

  /* ── Loading state ── */

  if (!session) {
    return (
      <>
        <div
          className="fixed inset-0 flex flex-col items-center justify-center text-white gap-4"
          style={{ background: theme.bgColor }}
        >
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }} />
          <p className="text-slate-400 text-xl">프로젝터 연결 중...</p>
        </div>
      </>
    )
  }

  const currentQ = session.current_question ?? 0
  const question = questions[currentQ]
  const totalParticipants = participants.length
  const pin = session.pin || ''
  const joinUrl = `${window.location.origin}/?pin=${pin}`

  // Count answers for current question
  let totalAnswered = 0
  participants.forEach((p) => {
    const ans = p.answers?.find((a) => a.questionIndex === currentQ)
    if (ans !== undefined) totalAnswered++
  })

  /* ══════════════════════════════════════════════════════════
     D1 - LOBBY (phase='lobby')
     ══════════════════════════════════════════════════════════ */

  if (session.phase === 'lobby') {
    return (
      <>
        <ThemedBackground
          bgImage={theme.bgImageProjector || null}
          bgColor={theme.bgColor}
          overlayOpacity={0.7}
          className="fixed inset-0 overflow-hidden text-white"
        >
          {/* Background glow (only when no bg image) */}
          {!theme.bgImageProjector && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute rounded-full"
                style={{
                  top: -200,
                  left: -200,
                  width: 800,
                  height: 800,
                  background: `radial-gradient(circle, ${theme.primaryColor}14 0%, transparent 70%)`,
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  bottom: -300,
                  right: -100,
                  width: 900,
                  height: 900,
                  background: `radial-gradient(circle, ${theme.accentColor}10 0%, transparent 70%)`,
                }}
              />
            </div>
          )}

          {/* Logo top-left */}
          <div className="absolute top-8 left-10 animate-fade-in">
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt="logo" className="w-10 h-10 rounded-lg object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.primaryColor}4D` }}>
                  <span className="text-xl font-bold" style={{ color: theme.primaryColor }}>K</span>
                </div>
              )}
              <span className="text-lg font-bold tracking-wider text-slate-300">KAC QUIZ</span>
            </div>
          </div>

          {/* Main content area */}
          <div className="relative flex items-center justify-center h-full px-20">
            <div className="flex items-center gap-32">

              {/* Center-left: QR Code */}
              <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div
                  className="p-6 rounded-3xl"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: `0 0 80px ${theme.primaryColor}1A`,
                  }}
                >
                  <div className="bg-white p-5 rounded-2xl">
                    <QRCode
                      value={joinUrl}
                      size={300}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor={theme.bgColor}
                    />
                  </div>
                </div>
                <p className="mt-6 text-2xl font-semibold text-slate-300 tracking-wide">
                  스캔하여 참가하세요
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-slate-500 text-lg">참가 코드:</span>
                  <div className="flex gap-2">
                    {pin.split('').map((digit, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center w-12 h-14 rounded-lg text-3xl font-bold"
                        style={{
                          backgroundColor: `${theme.accentColor}1A`,
                          border: `1px solid ${theme.accentColor}4D`,
                          color: theme.accentColor,
                        }}
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center-right: Participant count */}
              <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div
                  key={totalParticipants}
                  className="animate-scale-in"
                  style={{
                    fontSize: 180,
                    fontWeight: 900,
                    lineHeight: 1,
                    background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.primaryColor}CC 50%, ${theme.primaryColor}99 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: `drop-shadow(0 0 40px ${theme.primaryColor}4D)`,
                  }}
                >
                  {totalParticipants}
                </div>
                <p className="text-4xl font-bold text-slate-300 mt-2 tracking-wider">
                  명 참가 중
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full animate-pulse-slow"
                    style={{ backgroundColor: theme.correct }}
                  />
                  <span className="text-slate-500 text-lg">실시간 업데이트</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: event name */}
          <div className="absolute bottom-10 left-0 right-0 text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <p className="text-slate-500 text-xl tracking-widest uppercase">
              {theme.eventName || 'KAC 교육사업 퀴즈'}
            </p>
          </div>
        </ThemedBackground>
      </>
    )
  }

  /* ══════════════════════════════════════════════════════════
     D1.5 - READY (phase='ready') - 5초 카운트다운
     ══════════════════════════════════════════════════════════ */

  if (session.phase === 'ready') {
    return (
      <>
        <ThemedBackground
          bgImage={theme.bgImageProjector || null}
          bgColor={theme.bgColor}
          overlayOpacity={0.7}
          className="fixed inset-0 text-white flex flex-col items-center justify-center"
        >
          <p className="text-slate-400 text-2xl tracking-widest uppercase mb-4 animate-[fadeInUp_0.5s_ease-out]">다음 문제 준비</p>
          <p className="text-slate-500 text-lg mb-12">Q{(session.current_question ?? 0) + 1} / {questions.length}</p>
          <div className="relative w-56 h-56 mb-10">
            <svg width="224" height="224" className="-rotate-90">
              <circle cx="112" cy="112" r="96" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="112" cy="112" r="96" fill="none" stroke={theme.primaryColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 96} strokeDashoffset={0}
                className="animate-pulse" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-8xl font-extrabold tabular-nums animate-pulse">
              ?
            </span>
          </div>
          <p className="text-slate-500 text-lg">학생들이 준비할 수 있도록 잠시 대기합니다</p>
        </ThemedBackground>
      </>
    )
  }

  /* ══════════════════════════════════════════════════════════
     D2 - QUESTION (phase='play')
     ══════════════════════════════════════════════════════════ */

  if (session.phase === 'play' && question) {
    const ratio = remaining / question.time_limit
    const dashOffset = TIMER_CIRCUMFERENCE * (1 - ratio)
    const isLowTime = remaining <= 5 && remaining > 0
    const currentTimerColor = getTimerColor(theme, ratio)

    return (
      <>
        <ThemedBackground
          bgImage={question.image_url || theme.bgImageProjector || null}
          bgColor={theme.bgColor}
          overlayOpacity={question.image_url ? 0.45 : 0}
          className="fixed inset-0 overflow-hidden text-white"
        >
          {/* Fallback gradient when no image */}
          {!question.image_url && !theme.bgImageProjector && (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.bgSecondary} 50%, ${theme.bgColor} 100%)` }}
            />
          )}

          {/* Question text (center, large) */}
          <div className="absolute inset-0 flex items-center justify-center px-40 animate-fade-in-up">
            <p
              className="text-center font-bold leading-relaxed"
              style={{
                fontSize: question.question_text.length > 60 ? 48 : 64,
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                maxWidth: 1400,
              }}
            >
              {question.question_text}
            </p>
          </div>

          {/* Top-left HUD: Question number badge */}
          <div className="absolute top-8 left-10 animate-slide-in-left">
            <div
              className="flex items-center gap-4 px-6 py-3 rounded-2xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
            >
              <span
                className="flex items-center justify-center w-14 h-14 rounded-full text-white font-bold text-2xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.primaryColor}CC)`,
                  boxShadow: `0 0 20px ${theme.primaryColor}66`,
                }}
              >
                {currentQ + 1}
              </span>
              <div>
                <p className="text-slate-400 text-sm">QUESTION</p>
                <p className="text-lg font-semibold">{currentQ + 1} / {questions.length}</p>
              </div>
            </div>
          </div>

          {/* Top-right HUD: Timer + Answer count */}
          <div className="absolute top-8 right-10 flex items-center gap-6 animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
            {/* Answer completion count */}
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-2xl font-bold tabular-nums">{totalAnswered}</span>
              <span className="text-slate-500 text-lg">/</span>
              <span className="text-slate-400 text-xl tabular-nums">{totalParticipants}</span>
            </div>

            {/* Circular SVG timer */}
            <div
              className="relative flex items-center justify-center"
              style={isLowTime ? { animation: 'timerPulse 0.5s ease-in-out infinite' } : {}}
            >
              <svg width="120" height="120" className="-rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r={TIMER_RADIUS}
                  fill="rgba(0,0,0,0.6)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={TIMER_RADIUS}
                  fill="none"
                  stroke={currentTimerColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={TIMER_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke 0.3s', filter: `drop-shadow(0 0 8px ${currentTimerColor})` }}
                />
              </svg>
              <span
                className="absolute font-bold tabular-nums"
                style={{ fontSize: 36, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
              >
                {Math.ceil(remaining)}
              </span>
            </div>
          </div>
        </ThemedBackground>
      </>
    )
  }

  /* ══════════════════════════════════════════════════════════
     D2 REVEAL OVERLAY (phase='reveal')
     ══════════════════════════════════════════════════════════ */

  if (session.phase === 'reveal' && question) {
    return (
      <>
        <div
          className="fixed inset-0 overflow-hidden text-white"
        >
          {/* Background: same as play */}
          {question.image_url ? (
            <>
              <img
                src={question.image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.bgSecondary} 50%, ${theme.bgColor} 100%)` }}
            />
          )}

          {/* Semi-transparent dark overlay */}
          <div
            className="absolute inset-0 animate-overlay-in"
            style={{ background: theme.overlayColor }}
          />

          {/* Question text (dimmer) */}
          <div className="absolute top-8 left-0 right-0 text-center px-40 animate-fade-in">
            <p className="text-2xl text-slate-400 font-medium" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              Q{currentQ + 1}. {question.question_text}
            </p>
          </div>

          {/* Lottie correct overlay */}
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
            <LottieAnimation src={theme.lottieCorrect} fallback={null} className="w-96 h-96 opacity-30" loop={false} autoplay />
          </div>

          {/* Correct answer reveal */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 z-10">
            {/* Large green checkmark */}
            <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="75" fill={`${theme.correct}26`} stroke={theme.correct} strokeWidth="4" />
                <path
                  d="M 45 82 L 70 107 L 115 58"
                  fill="none"
                  stroke={theme.correct}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 100,
                    animation: 'checkmarkDraw 0.8s ease-out 0.4s both',
                  }}
                />
              </svg>
            </div>

            {/* Answer text */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <p className="text-3xl font-semibold mb-4 text-center" style={{ color: theme.correct }}>정답</p>
              <div
                className="px-16 py-8 rounded-3xl"
                style={{
                  backgroundColor: `${theme.correct}1F`,
                  border: `2px solid ${theme.correct}66`,
                  boxShadow: `0 0 60px ${theme.correct}26`,
                }}
              >
                <p className="text-5xl font-bold text-center" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  {question.options[question.correct_index]}
                </p>
              </div>
            </div>

            {/* Response stats */}
            <div className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <p className="text-slate-400 text-xl">
                {totalAnswered} / {totalParticipants} 명 응답 완료
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ══════════════════════════════════════════════════════════
     D3 - RANKING (phase='rank')
     ══════════════════════════════════════════════════════════ */

  if (session.phase === 'rank') {
    const sorted = [...participants].sort((a, b) => b.score - a.score)
    const top10 = sorted.slice(0, 10)
    const medalStyles = [
      { bg: `${theme.medalGold}1F`, border: `${theme.medalGold}66`, badgeBg: theme.medalGold, label: '1st' },
      { bg: `${theme.medalSilver}1A`, border: `${theme.medalSilver}4D`, badgeBg: theme.medalSilver, label: '2nd' },
      { bg: `${theme.medalBronze}1A`, border: `${theme.medalBronze}4D`, badgeBg: theme.medalBronze, label: '3rd' },
    ]

    return (
      <>
        <ThemedBackground
          bgImage={theme.bgImageProjector || null}
          bgColor={theme.bgColor}
          overlayOpacity={0.7}
          className="fixed inset-0 overflow-hidden text-white"
        >
          {/* Background glow (only when no bg image) */}
          {!theme.bgImageProjector && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute rounded-full"
                style={{
                  top: '10%',
                  left: '30%',
                  width: 600,
                  height: 600,
                  background: `radial-gradient(circle, ${theme.primaryColor}10 0%, transparent 70%)`,
                }}
              />
            </div>
          )}

          {/* Title */}
          <div className="text-center pt-14 pb-8 animate-fade-in-up">
            <h1 className="text-6xl font-black tracking-tight">
              중간 순위
            </h1>
            <p className="text-slate-500 text-xl mt-3">Q{currentQ + 1} 완료</p>
          </div>

          {/* Top 10 list */}
          <div className="max-w-[1200px] mx-auto px-16">
            {top10.map((p, i) => {
              const rank = i + 1
              const isTop3 = rank <= 3
              const medal = isTop3 ? medalStyles[i] : null
              const prevRank = prevRankMap[p.id]
              let arrow: 'up' | 'down' | 'stable' = 'stable'
              if (prevRank) {
                if (prevRank > rank) arrow = 'up'
                else if (prevRank < rank) arrow = 'down'
              }

              return (
                <div
                  key={p.id}
                  className="animate-slide-in-right flex items-center gap-6 mb-3 px-8 py-4 rounded-2xl"
                  style={{
                    animationDelay: `${i * 0.12}s`,
                    backgroundColor: medal ? medal.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${medal ? medal.border : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {/* Rank badge */}
                  <div className="w-16 shrink-0 flex justify-center">
                    {isTop3 ? (
                      <span
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full text-black font-black text-xl"
                        style={{ backgroundColor: medal!.badgeBg }}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="text-3xl font-bold text-slate-500 tabular-nums">{rank}</span>
                    )}
                  </div>

                  {/* Rank change arrow */}
                  <div className="w-10 shrink-0 flex justify-center">
                    {arrow === 'up' && (
                      <span style={{ color: theme.correct }} className="text-xl font-bold">{'\u25B2'}</span>
                    )}
                    {arrow === 'down' && (
                      <span style={{ color: theme.incorrect }} className="text-xl font-bold">{'\u25BC'}</span>
                    )}
                    {arrow === 'stable' && (
                      <span className="text-slate-600 text-lg">{'\u2014'}</span>
                    )}
                  </div>

                  {/* Name & class */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isTop3 ? 'text-2xl text-white' : 'text-xl text-slate-300'}`}>
                      {p.name}
                    </p>
                    <p className="text-slate-500 text-sm">{p.class_name}</p>
                  </div>

                  {/* Score */}
                  <div className="shrink-0">
                    <span
                      className={`font-black tabular-nums ${isTop3 ? 'text-3xl' : 'text-2xl text-slate-400'}`}
                      style={isTop3 ? { color: medal!.badgeBg } : {}}
                    >
                      {p.score}
                    </span>
                    <span className="text-slate-600 text-lg ml-1">점</span>
                  </div>
                </div>
              )
            })}
          </div>
        </ThemedBackground>
      </>
    )
  }

  /* ══════════════════════════════════════════════════════════
     D4 - FINAL AWARDS (phase='ended')
     ══════════════════════════════════════════════════════════ */

  if (session.phase === 'ended') {
    const sorted = [...participants].sort((a, b) => b.score - a.score)
    const top3 = sorted.slice(0, 3)
    const medals = [
      { emoji: '\u{1F947}', label: '1st Place', color: theme.medalGold, glow: `${theme.medalGold}4D` },
      { emoji: '\u{1F948}', label: '2nd Place', color: theme.medalSilver, glow: `${theme.medalSilver}4D` },
      { emoji: '\u{1F949}', label: '3rd Place', color: theme.medalBronze, glow: `${theme.medalBronze}4D` },
    ]
    // Reveal order: 3rd(index 2) -> 2nd(index 1) -> 1st(index 0)
    const revealOrder = [2, 1, 0]

    return (
      <>
        <ThemedBackground
          bgImage={theme.bgImageProjector || null}
          bgColor={theme.bgColor}
          overlayOpacity={0.7}
          className="fixed inset-0 overflow-hidden text-white flex flex-col items-center justify-center"
        >
          {/* Confetti for 1st place reveal — Lottie + CSS fallback */}
          {awardPhase >= 3 && (
            <>
              <div className="absolute inset-0 pointer-events-none z-0">
                <LottieAnimation src={theme.lottieCelebration} fallback={null} className="w-full h-full" loop autoplay />
              </div>
              <ConfettiParticles theme={theme} />
            </>
          )}

          {/* Background glow */}
          {!theme.bgImageProjector && (
            <div className="absolute inset-0 pointer-events-none">
              {awardPhase >= 3 && (
                <div
                  className="absolute rounded-full"
                  style={{
                    top: '20%',
                    left: '25%',
                    width: 1000,
                    height: 600,
                    background: `radial-gradient(ellipse, ${theme.medalGold}14 0%, transparent 70%)`,
                  }}
                />
              )}
            </div>
          )}

          {/* Title */}
          <div className="absolute top-12 text-center animate-fade-in-up">
            <h1 className="text-5xl font-black tracking-tight">
              {awardPhase < 1 ? '결과 발표 준비 중...' : '최종 수상자'}
            </h1>
          </div>

          {/* Award entries */}
          <div className="flex flex-col items-center gap-10 mt-8">
            {revealOrder.map((placeIdx) => {
              const p = top3[placeIdx]
              if (!p) return null
              const medal = medals[placeIdx]
              const revealStep = placeIdx === 2 ? 1 : placeIdx === 1 ? 2 : 3
              const isRevealed = awardPhase >= revealStep
              const isFirst = placeIdx === 0

              if (!isRevealed) return null

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-8 px-16 py-8 rounded-3xl animate-award-reveal ${isFirst ? 'animate-glow-pulse' : ''}`}
                  style={{
                    backgroundColor: `${medal.color}14`,
                    border: `2px solid ${medal.color}40`,
                    minWidth: 800,
                  }}
                >
                  {/* Medal emoji */}
                  <span style={{ fontSize: isFirst ? 80 : 60 }}>{medal.emoji}</span>

                  {/* Name + class */}
                  <div className="flex-1">
                    <p
                      className={`font-black ${isFirst ? 'shimmer-text' : ''}`}
                      style={{
                        fontSize: isFirst ? 56 : 44,
                        color: isFirst ? undefined : medal.color,
                      }}
                    >
                      {p.name}
                    </p>
                    <p className="text-slate-400 text-2xl mt-1">{p.class_name}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span
                      className="font-black tabular-nums"
                      style={{ fontSize: isFirst ? 60 : 48, color: medal.color }}
                    >
                      {p.score}
                    </span>
                    <span className="text-slate-500 text-2xl ml-2">점</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Waiting indicator */}
          {awardPhase < 1 && (
            <div className="animate-pulse-slow mt-12">
              <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }} />
            </div>
          )}

          {/* Bottom text */}
          <div
            className="absolute bottom-10 text-center animate-fade-in"
            style={{ animationDelay: '8.5s' }}
          >
            <p className="text-slate-500 text-xl tracking-widest uppercase mb-2">
              {theme.eventName || 'KAC 교육사업'}
            </p>
            <p
              className="text-3xl font-bold"
              style={{
                background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}CC, ${theme.accentColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              수고하셨습니다!
            </p>
          </div>
        </ThemedBackground>
      </>
    )
  }

  /* ── Fallback ── */

  return (
    <>
      <div
        className="fixed inset-0 flex flex-col items-center justify-center text-white gap-4"
        style={{ background: theme.bgColor }}
      >
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }} />
        <p className="text-slate-400 text-xl">로딩 중...</p>
      </div>
    </>
  )
}
