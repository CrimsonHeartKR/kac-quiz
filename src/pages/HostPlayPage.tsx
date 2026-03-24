import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuizSession } from '../hooks/useQuizSession'
import { supabase } from '../lib/supabase'
import { useTheme, getButtonColors } from '../lib/theme'
import AudioControls from '../components/AudioControls'
import { useAudio } from '../hooks/useAudio'

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

/* ── CSS Animations are in src/styles/animations.css ───── */

/* ── Main Component ──────────────────────────────────────── */

export default function HostPlayPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session') || undefined

  const {
    session,
    participants,
    revealAnswer,
    nextQuestion,
    startQuestion,
    showRanking,
    endSession,
  } = useQuizSession({ sessionId })

  const theme = useTheme(session?.quiz_set_id)
  const { playSfx, playBgm, stopBgm } = useAudio()
  const BUTTON_COLORS = getButtonColors(theme)
  const BAR_LABELS = ['A', 'B', 'C', 'D']


  const [questions, setQuestions] = useState<Question[]>([])
  const [remaining, setRemaining] = useState(0)
  const [readyCount, setReadyCount] = useState(3)
  const [prevRanks, setPrevRanks] = useState<Map<string, number>>(new Map())
  const [questionTextColor, setQuestionTextColor] = useState('#FFFFFF')
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const lastQRef = useRef<number>(-1)

  // Load questions + quiz set settings
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
      // 퀴즈세트 설정 로드
      const { data: qs } = await supabase
        .from('quiz_sets')
        .select('question_text_color')
        .eq('id', session.quiz_set_id)
        .single()
      if (qs?.question_text_color) setQuestionTextColor(qs.question_text_color)
    })()
  }, [session?.quiz_set_id])

  // Timer sync
  useEffect(() => {
    if (!session || !questions.length) return
    const currentQ = session.current_question ?? 0
    const question = questions[currentQ]
    if (!question || session.phase !== 'play') {
      cancelAnimationFrame(rafRef.current)
      return
    }

    if (currentQ !== lastQRef.current) {
      lastQRef.current = currentQ
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

  // Ready phase countdown
  useEffect(() => {
    if (!session || session.phase !== 'ready') return
    setReadyCount(3)
    const interval = setInterval(() => {
      setReadyCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          startQuestion()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [session?.phase, session?.current_question, startQuestion])

  // Save previous ranks when entering rank phase
  useEffect(() => {
    if (session?.phase === 'reveal') {
      const rankMap = new Map<string, number>()
      const sorted = [...participants].sort((a, b) => b.score - a.score)
      sorted.forEach((p, i) => rankMap.set(p.id, i + 1))
      setPrevRanks(rankMap)
    }
  }, [session?.phase])

  // Audio: phase-based BGM & SFX triggers
  useEffect(() => {
    const phase = session?.phase
    if (!phase) return

    if (phase === 'play' || phase === 'ready') {
      playBgm('play')
    } else if (phase === 'reveal') {
      playSfx('correctAnswer')
    } else if (phase === 'rank') {
      playSfx('rankingReveal')
      playBgm('result')
    } else if (phase === 'ended') {
      playSfx('celebrate')
      playBgm('result')
    } else if (phase === 'lobby') {
      stopBgm()
    }
  }, [session?.phase, playSfx, playBgm, stopBgm])

  /* ── Loading states ── */

  if (!session) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center text-white gap-4" style={{ background: theme.bgColor }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${theme.primaryColor} transparent transparent transparent` }} />
        <p className="text-slate-400">세션 연결 중...</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center text-white gap-4" style={{ background: theme.bgColor }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${theme.primaryColor} transparent transparent transparent` }} />
        <p className="text-slate-400">문제 로딩 중...</p>
      </div>
    )
  }

  const currentQ = session.current_question ?? 0
  const question = questions[currentQ]
  const totalParticipants = participants.length
  const isLastQuestion = currentQ >= questions.length - 1

  // Count answers
  const optCount = question ? question.options.length : 4
  const answerCounts = Array(optCount).fill(0)
  let totalAnswered = 0
  participants.forEach((p) => {
    const ans = p.answers?.find((a) => a.questionIndex === currentQ)
    if (ans !== undefined && ans.answerIndex >= 0 && ans.answerIndex < optCount) {
      answerCounts[ans.answerIndex]++
      totalAnswered++
    }
  })
  /* ── Confetti Effect Component ── */
  const ConfettiEffect = () => {
    const confettiColors = ['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#6366F1','#A855F7','#EC4899']
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {Array.from({ length: 60 }).map((_, i) => {
          const color = confettiColors[i % confettiColors.length]
          const left = Math.random() * 100
          const delay = Math.random() * 3
          const duration = 3 + Math.random() * 2
          const rotation = Math.random() * 360
          const size = 6 + Math.random() * 8
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: '-20px',
                width: `${size}px`,
                height: `${size * 1.6}px`,
                backgroundColor: color,
                borderRadius: '2px',
                transform: `rotate(${rotation}deg)`,
                animation: `confettiFall ${duration}s ${delay}s linear infinite`,
              }}
            />
          )
        })}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    )
  }

  /* ── Progress Bar (gradient red to yellow to green) ── */
  const ProgressBar = () => {
    const progress = ((currentQ + 1) / questions.length) * 100
    return (
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #EF4444, #EAB308, #22C55E)',
          }}
        />
      </div>
    )
  }

  /* ── Top Header Bar (shared across play phases) ── */
  const HeaderBar = ({ showTimer = false }: { showTimer?: boolean }) => {
    const timerRatio = question ? remaining / question.time_limit : 0
    const timerColor = timerRatio > 0.6 ? '#22C55E' : timerRatio > 0.3 ? '#EAB308' : '#EF4444'
    return (
      <div className="shrink-0 flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200">
        {/* Q number */}
        <span className="text-sm font-bold text-gray-700 shrink-0 whitespace-nowrap">
          Q{currentQ + 1}/{questions.length}
        </span>

        {/* Progress bar */}
        <ProgressBar />

        {/* PIN */}
        <span className="text-sm font-semibold text-gray-500 shrink-0 whitespace-nowrap">
          PIN: {session.pin}
        </span>

        {/* Response count badge */}
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full shrink-0 whitespace-nowrap">
          {totalAnswered}/{totalParticipants}
        </span>

        {/* Audio */}
        <div className="shrink-0">
          <AudioControls />
        </div>

        {/* Timer */}
        {showTimer && (
          <span
            className="text-5xl font-extrabold tabular-nums shrink-0 leading-none"
            style={{ color: timerColor }}
          >
            {Math.ceil(remaining)}
          </span>
        )}
      </div>
    )
  }

  /* ── Phase: ended ── */
  if (session.phase === 'ended' || !question) {
    const sorted = [...participants].sort((a, b) => b.score - a.score)
    const top3 = sorted.slice(0, 3)
    const podiumColors = ['#EAB308', '#9CA3AF', '#CD7F32']
    const medalEmojis = ['\u{1F947}', '\u{1F948}', '\u{1F949}']
    const podiumHeights = ['h-44', 'h-36', 'h-28']
    // Display order: 2nd, 1st, 3rd
    const podiumOrder = [1, 0, 2]

    return (
      <div className="fixed inset-0 bg-white text-gray-900 flex flex-col overflow-auto">
        <ConfettiEffect />

        {/* Title */}
        <div className="flex items-center justify-center pt-10 pb-6 relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight anim-scale-in">Show 랭킹</h1>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 px-8 mb-10 relative z-10">
          {podiumOrder.map((podiumIdx) => {
            const p = top3[podiumIdx]
            if (!p) return <div key={podiumIdx} className="w-40" />
            return (
              <div key={p.id} className="flex flex-col items-center anim-fade-up" style={{ animationDelay: `${podiumIdx * 0.2}s` }}>
                {/* Avatar circle */}
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600 mb-2 border-2 border-gray-300">
                  {p.name.charAt(0)}
                </div>
                <span className="text-2xl mb-1">{medalEmojis[podiumIdx]}</span>
                <p className="text-lg font-bold mb-0.5">{p.name}</p>
                <p className="text-sm text-gray-500 mb-3">{p.score}점</p>
                {/* Podium box */}
                <div
                  className={`w-36 ${podiumHeights[podiumIdx]} rounded-t-xl flex items-center justify-center`}
                  style={{ backgroundColor: podiumColors[podiumIdx] }}
                >
                  <span className="text-white font-extrabold text-2xl">{podiumIdx + 1}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Full ranking list */}
        <div className="flex-1 max-w-3xl mx-auto w-full px-8 pb-6 relative z-10">
          <div className="space-y-2">
            {sorted.map((p, i) => {
              const rank = i + 1
              return (
                <div key={p.id} className={`flex items-center gap-4 px-5 py-3 rounded-xl ${rank <= 3 ? 'bg-gray-50 border border-gray-200' : 'bg-white'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rank <= 3 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {rank}
                  </span>
                  {rank === 1 && <span className="text-lg">{'\u2B50'}</span>}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-sm text-gray-500 truncate">{p.class_name}</p>
                  </div>
                  <span className="font-bold tabular-nums text-lg">{p.score}점</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-4 py-8 shrink-0 relative z-10">
          <button
            className="bg-white border border-gray-300 text-gray-700 rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-50 active:scale-95"
            onClick={() => {/* capture screen */}}
          >
            화면 캡처
          </button>
          <button
            className="bg-white border border-gray-300 text-gray-700 rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-50 active:scale-95"
          >
            랭킹 더 보기
          </button>
          <button
            className="bg-gray-900 text-white rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-800 active:scale-95"
            onClick={() => navigate('/host')}
          >
            새 퀴즈 시작
          </button>
        </div>
      </div>
    )
  }

  /* ── Phase: ready ── */
  if (session.phase === 'ready') {
    const readyProgress = ((3 - readyCount) / 3) * 100
    return (
      <div className="fixed inset-0 bg-white text-gray-900 flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-2 tracking-wider uppercase">다음 문제 준비</p>
        <p className="text-gray-400 text-sm mb-10">Q{currentQ + 1} / {questions.length}</p>

        {/* Countdown number */}
        <span className="text-9xl font-extrabold tabular-nums text-gray-900 mb-8 anim-countdown">
          {readyCount}
        </span>

        {/* Progress bar */}
        <div className="w-64 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${readyProgress}%`,
              background: 'linear-gradient(90deg, #EF4444, #EAB308, #22C55E)',
            }}
          />
        </div>
      </div>
    )
  }

  /* ── Phase: rank ── */
  if (session.phase === 'rank') {
    const sorted = [...participants].sort((a, b) => b.score - a.score)
    const top10 = sorted.slice(0, 10)

    return (
      <div className="fixed inset-0 bg-white text-gray-900 flex flex-col overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 shrink-0 border-b border-gray-200">
          <h2 className="text-2xl font-bold">Q{currentQ + 1} 순위</h2>
          <span className="text-gray-500 text-sm">{totalParticipants}명 참가</span>
        </div>

        {/* Ranking list */}
        <div className="flex-1 max-w-3xl mx-auto w-full px-10 py-6 overflow-y-auto">
          <div className="space-y-3">
            {top10.map((p, i) => {
              const rank = i + 1
              const isTopThree = rank <= 3
              const oldRank = prevRanks.get(p.id)
              const rankDiff = oldRank ? oldRank - rank : 0

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 rounded-xl px-5 py-4 transition-all anim-rank-in ${isTopThree ? 'bg-gray-50 border border-gray-200' : 'bg-white border border-gray-100'}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {/* Star for 1st */}
                  {rank === 1 && <span className="text-lg shrink-0">{'\u2B50'}</span>}

                  {/* Avatar circle */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {p.name.charAt(0)}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isTopThree ? 'text-gray-900 text-lg' : 'text-gray-700'}`}>{p.name}</p>
                    <p className="text-gray-500 text-sm truncate">{p.class_name}</p>
                  </div>

                  {/* Rank change indicator */}
                  {rankDiff !== 0 && (
                    <span className={`text-sm font-bold shrink-0 ${rankDiff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {rankDiff > 0 ? `\u25B2${rankDiff}` : `\u25BC${Math.abs(rankDiff)}`}
                    </span>
                  )}

                  {/* Score */}
                  <span className={`tabular-nums font-bold shrink-0 ${isTopThree ? 'text-gray-900 text-xl' : 'text-gray-600 text-lg'}`}>
                    {p.score}점
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-4 py-8 shrink-0 border-t border-gray-200">
          <button
            className="bg-white border border-gray-300 text-gray-700 rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-50 active:scale-95"
          >
            누적 점수
          </button>
          {isLastQuestion ? (
            <button
              onClick={endSession}
              className="bg-gray-900 text-white rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-800 active:scale-95"
            >
              최종 결과 발표
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="bg-gray-900 text-white rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-800 active:scale-95"
            >
              다음 문항 →
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── Phase: reveal ── */
  if (session.phase === 'reveal') {
    const maxCount = Math.max(...answerCounts, 1)
    const correctCount = answerCounts[question.correct_index] || 0
    const correctRate = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

    // Fastest correct responder
    const fastestCorrect = (() => {
      let fastest: { name: string; time: number } | null = null
      participants.forEach((p) => {
        const ans = p.answers?.find((a) => a.questionIndex === currentQ)
        if (ans && ans.answerIndex === question.correct_index && ans.timestamp && session.question_started_at) {
          const t = (new Date(ans.timestamp).getTime() - new Date(session.question_started_at).getTime()) / 1000
          if (!fastest || t < fastest.time) fastest = { name: p.name, time: Math.max(0, t) }
        }
      })
      return fastest as { name: string; time: number } | null
    })()

    return (
      <div className="fixed inset-0 bg-white text-gray-900 flex flex-col overflow-hidden">
        {/* Header */}
        <HeaderBar />

        {/* Question text */}
        <div className="px-8 py-5 shrink-0">
          <div className="flex items-center gap-5">
            {question.image_url && (
              <img src={question.image_url} alt="" className="h-24 w-auto rounded-2xl object-contain shadow-md shrink-0" />
            )}
            <p className="text-2xl font-bold leading-relaxed text-gray-900">{question.question_text}</p>
          </div>
        </div>

        {/* Stats inline */}
        <div className="px-8 pb-4 flex items-center gap-6 text-sm shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">정답률</span>
            <span className="font-bold text-green-600">{correctRate}%</span>
            <span className="text-gray-400">({correctCount}/{totalAnswered}명)</span>
          </span>
          {fastestCorrect && (
            <span className="flex items-center gap-1.5">
              <span className="text-gray-500">최빠른 정답</span>
              <span className="font-bold text-orange-500">{fastestCorrect.name}</span>
              <span className="text-gray-400">{fastestCorrect.time.toFixed(1)}초</span>
            </span>
          )}
        </div>

        {/* Answer bars */}
        <div className="flex-1 flex flex-col justify-center gap-3 px-8 overflow-y-auto">
          {question.options.map((opt, idx) => {
            const count = answerCounts[idx]
            const pct = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0
            const barWidth = totalAnswered > 0 ? (count / maxCount) * 100 : 0
            const isCorrect = idx === question.correct_index
            const btnColor = BUTTON_COLORS[idx]?.bg || theme.primaryColor

            return (
              <div key={idx} className="flex items-center gap-3 anim-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <span
                  className="flex items-center justify-center w-11 h-11 rounded-xl text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: btnColor }}
                >
                  {BAR_LABELS[idx]}
                </span>
                <div className="flex-1 relative">
                  <div
                    className="rounded-xl h-14 flex items-center transition-all duration-700 relative overflow-hidden"
                    style={{
                      backgroundColor: isCorrect ? '#DCFCE7' : '#F3F4F6',
                      border: isCorrect ? '2px solid #22C55E' : '2px solid transparent',
                    }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-xl anim-bar-grow"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: isCorrect ? '#BBF7D0' : '#E5E7EB',
                      }}
                    />
                    <span className="relative z-10 px-4 font-semibold truncate flex-1 text-gray-900">
                      {question.question_type === 'ox' ? (idx === 0 ? 'O' : 'X') : opt}
                    </span>
                    {isCorrect && (
                      <span className="relative z-10 mr-3 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0 anim-correct-reveal">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-24 text-right shrink-0">
                  <span className="text-xl font-bold tabular-nums text-gray-900">{count}</span>
                  <span className="text-gray-500 text-sm ml-1">({pct}%)</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-4 py-6 shrink-0 border-t border-gray-200">
          <button
            className="bg-white border border-gray-300 text-gray-700 rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-50 active:scale-95"
          >
            참여현황
          </button>
          <button
            onClick={showRanking}
            className="bg-gray-900 text-white rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-800 active:scale-95"
          >
            다음 →
          </button>
        </div>
      </div>
    )
  }

  /* ── Phase: play (default) ── */

  return (
    <div className="fixed inset-0 bg-white text-gray-900 flex flex-col overflow-hidden">

      {/* ── Top Header Bar ── */}
      <HeaderBar showTimer />

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Question area: text (left 70%) + image (right 30%) */}
        <div className="flex items-stretch px-8 py-6 gap-6 shrink-0">
          {/* Question text */}
          <div className="flex-[7] flex flex-col justify-center">
            <p
              className="text-3xl font-bold leading-relaxed"
              style={{ color: questionTextColor === '#FFFFFF' ? '#111827' : questionTextColor }}
            >
              {question.question_text}
            </p>
            <p className="mt-3 text-sm text-gray-500">
              {'\uD83D\uDC64'} {totalAnswered}/{totalParticipants} 응답
            </p>
          </div>
          {/* Question image */}
          {question.image_url && (
            <div className="flex-[3] flex items-center justify-center">
              <img
                src={question.image_url}
                alt="문제 이미지"
                className="max-h-52 w-auto rounded-2xl object-contain shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Options area */}
        <div className="flex-1 flex flex-col justify-center px-8 pb-4 gap-3">
          {question.question_type === 'ox' ? (
            /* OX: 2 large cards with blue O circle and red X */
            <div className="flex justify-center gap-8">
              {['O', 'X'].map((_, idx) => (
                <div
                  key={idx}
                  className="w-40 h-40 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 anim-fade-up"
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    backgroundColor: idx === 0 ? '#EFF6FF' : '#FEF2F2',
                    border: idx === 0 ? '3px solid #3B82F6' : '3px solid #EF4444',
                  }}
                >
                  {idx === 0 ? (
                    /* Blue O circle */
                    <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="30" stroke="#3B82F6" strokeWidth="8" fill="none" />
                    </svg>
                  ) : (
                    /* Red X icon */
                    <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
                      <line x1="20" y1="20" x2="60" y2="60" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
                      <line x1="60" y1="20" x2="20" y2="60" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          ) : question.question_type === 'image' ? (
            /* Image: 2x2 grid with square images */
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {question.options.map((opt, idx) => {
                const btnColor = BUTTON_COLORS[idx]?.bg || theme.primaryColor
                const imgUrl = question.option_images?.[idx]
                return (
                  <div key={idx} className="flex flex-col items-center anim-fade-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                    <div className="relative rounded-2xl overflow-hidden shadow-md aspect-square w-full max-w-[220px]">
                      {imgUrl ? (
                        <img src={imgUrl} alt={opt} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 text-4xl">
                          {BAR_LABELS[idx]}
                        </div>
                      )}
                      <span
                        className="absolute top-2 left-2 flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm shadow-md"
                        style={{ backgroundColor: btnColor }}
                      >
                        {BAR_LABELS[idx]}
                      </span>
                    </div>
                    {opt && (
                      <p className="mt-1.5 text-center text-gray-800 font-semibold text-sm truncate w-full max-w-[220px]">{opt}</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Text: horizontal color cards */
            <div className="flex gap-4 justify-center flex-wrap">
              {question.options.map((opt, idx) => {
                const btnColor = BUTTON_COLORS[idx]?.bg || theme.primaryColor
                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[140px] max-w-[260px] rounded-2xl px-5 py-6 flex flex-col items-center justify-center shadow-md transition-transform hover:scale-[1.02] anim-fade-up"
                    style={{
                      animationDelay: `${idx * 0.08}s`,
                      backgroundColor: btnColor,
                    }}
                  >
                    <span className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-sm mb-3">
                      {idx + 1}
                    </span>
                    <span className="text-white font-semibold text-center text-lg leading-snug">{opt}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Action Bar ── */}
      <div className="shrink-0 flex items-center justify-center gap-4 px-8 py-5 border-t border-gray-200">
        <button
          className="bg-white border border-gray-300 text-gray-700 rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-gray-50 active:scale-95"
          onClick={revealAnswer}
        >
          건너뛰기
        </button>
        <button
          onClick={revealAnswer}
          className="bg-orange-500 text-white rounded-xl px-8 py-3 font-semibold transition-colors hover:bg-orange-600 active:scale-95"
        >
          정답 공개
        </button>
      </div>
    </div>
  )
}
