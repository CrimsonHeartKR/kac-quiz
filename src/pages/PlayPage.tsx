import { useEffect, useState, useRef, useCallback } from 'react'
import { useQuizSession } from '../hooks/useQuizSession'
import { supabase } from '../lib/supabase'
import { calculateScore } from '../lib/scoring'
import { useTheme } from '../lib/theme'
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

/* ── Choice card colors (quizn.show style) ───────────────── */

const CHOICE_COLORS = ['#2DD4BF', '#3B82F6', '#F59E0B', '#A855F7']

/* ── Header Bar Component ────────────────────────────────── */

function PlayHeader({
  score,
  name,
  questionIndex,
  totalQuestions,
  remaining,
  timeLimit,
}: {
  score: number
  name: string
  questionIndex: number
  totalQuestions: number
  remaining: number
  timeLimit: number
}) {
  const ratio = remaining / timeLimit
  return (
    <div className="shrink-0 bg-white px-4 pt-3 pb-2">
      {/* Top row: score / name */}
      <div className="flex items-center justify-end gap-2 mb-2">
        <span className="text-gray-900 font-extrabold text-lg">{score.toLocaleString()}</span>
        <span className="text-gray-500 text-sm">/ {name}</span>
      </div>
      {/* Bottom row: progress */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium shrink-0">
          {questionIndex + 1}/{totalQuestions}
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${ratio * 100}%`,
              background: 'linear-gradient(90deg, #EAB308, #EF4444)',
            }}
          />
        </div>
        <span className="text-2xl font-extrabold text-gray-900 tabular-nums shrink-0 min-w-[2ch] text-right">
          {Math.ceil(remaining)}
        </span>
      </div>
    </div>
  )
}

/* ── Sub-screens ──────────────────────────────────────────── */

function QuestionScreen({
  question,
  questionIndex,
  score,
  questionStartedAt,
  onSubmit,
  totalQuestions,
  playerName,
}: {
  question: Question
  questionIndex: number
  score: number
  questionStartedAt: string
  onSubmit: (answerIndex: number, remainingTime: number) => void
  totalQuestions: number
  playerName: string
}) {
  const [remaining, setRemaining] = useState(question.time_limit)
  const [selected, setSelected] = useState<number | null>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef(new Date(questionStartedAt).getTime())

  useEffect(() => {
    setSelected(null)
    startRef.current = new Date(questionStartedAt).getTime()
    setRemaining(question.time_limit)
  }, [questionIndex, questionStartedAt, question.time_limit])

  useEffect(() => {
    if (selected !== null) return
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
  }, [question.time_limit, selected, questionIndex])

  const handleSelect = (idx: number) => {
    if (selected !== null) return
    const elapsed = (Date.now() - startRef.current) / 1000
    const left = Math.max(0, question.time_limit - elapsed)
    setSelected(idx)
    setRemaining(left)
    onSubmit(idx, left)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F5F5]">
      {/* Header */}
      <PlayHeader
        score={score}
        name={playerName}
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        remaining={remaining}
        timeLimit={question.time_limit}
      />

      {/* Submitted overlay */}
      {selected !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="bg-white rounded-2xl px-10 py-8 text-center shadow-2xl">
            <p className="text-3xl font-extrabold text-gray-900">제출 완료</p>
            <p className="text-gray-500 text-base mt-2">결과를 기다리는 중...</p>
          </div>
        </div>
      )}

      {/* Answer area */}
      {question.question_type === 'ox' ? (
        /* OX: 2 large cards side by side */
        <div className="flex-1 flex items-center justify-center gap-4 px-4 py-4">
          {['O', 'X'].map((_, idx) => {
            const isSelected = selected === idx
            const isDisabled = selected !== null && !isSelected
            return (
              <button
                key={idx}
                disabled={selected !== null}
                onClick={() => handleSelect(idx)}
                className="flex-1 h-full max-h-[300px] rounded-2xl flex items-center justify-center active:scale-[0.97] transition-all duration-150"
                style={{
                  backgroundColor: idx === 0 ? '#EFF6FF' : '#FEF2F2',
                  border: idx === 0 ? '3px solid #3B82F6' : '3px solid #EF4444',
                  opacity: isDisabled ? 0.35 : 1,
                  transform: isSelected ? 'scale(1.03)' : undefined,
                  boxShadow: isSelected
                    ? `0 0 0 4px ${idx === 0 ? '#3B82F6' : '#EF4444'}, 0 8px 24px rgba(0,0,0,0.15)`
                    : '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {idx === 0 ? (
                  /* Blue O circle SVG */
                  <svg className="w-24 h-24" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="30" stroke="#3B82F6" strokeWidth="8" fill="none" />
                  </svg>
                ) : (
                  /* Red X SVG */
                  <svg className="w-24 h-24" viewBox="0 0 80 80" fill="none">
                    <line x1="20" y1="20" x2="60" y2="60" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
                    <line x1="60" y1="20" x2="20" y2="60" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        /* 4-choice: 2x2 grid of color cards filling screen */
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-3">
          {question.options.map((_, idx) => {
            const color = CHOICE_COLORS[idx] || CHOICE_COLORS[0]
            const isSelected = selected === idx
            const isDisabled = selected !== null && !isSelected
            return (
              <button
                key={idx}
                disabled={selected !== null}
                onClick={() => handleSelect(idx)}
                className="relative rounded-2xl flex items-center justify-center active:scale-[0.97] transition-all duration-150"
                style={{
                  backgroundColor: color,
                  opacity: isDisabled ? 0.35 : 1,
                  transform: isSelected ? 'scale(1.03)' : undefined,
                  boxShadow: isSelected
                    ? `0 0 0 4px white, 0 8px 24px rgba(0,0,0,0.2)`
                    : '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {/* Number badge top-right */}
                <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-lg">
                  {idx + 1}
                </span>
                {/* Image if image question */}
                {question.question_type === 'image' && question.option_images[idx] && (
                  <img
                    src={question.option_images[idx]!}
                    alt={`Option ${idx + 1}`}
                    className="w-full h-full object-cover rounded-2xl absolute inset-0"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RevealScreen({
  question,
  selectedIndex,
  pointsEarned,
  playSfx,
  score,
  questionIndex,
  totalQuestions,
}: {
  question: Question
  selectedIndex: number | null
  pointsEarned: number
  playSfx: (name: import('../lib/audio/SoundSynthesizer').SfxName) => void
  score: number
  questionIndex: number
  totalQuestions: number
}) {
  const isCorrect = selectedIndex === question.correct_index

  // Play correct/incorrect SFX on mount
  useEffect(() => {
    playSfx(isCorrect ? 'correctAnswer' : 'incorrectAnswer')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const bgColor = isCorrect ? '#06B6D4' : '#EF4444'

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <span className="text-white/90 text-sm font-medium">
          score <span className="font-bold text-white">{score.toLocaleString()}점</span>
        </span>
        <span className="text-white/90 text-sm font-medium">
          {questionIndex + 1}번째 문제 / {totalQuestions}문제
        </span>
      </div>

      {/* Main result */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-white text-2xl font-bold mb-4">
          {isCorrect ? 'Congratulations!!' : '끝까지 힘내세요!'}
        </p>
        <p className="text-yellow-300 font-extrabold mb-2" style={{ fontSize: 'clamp(3rem, 15vw, 6rem)' }}>
          {pointsEarned.toLocaleString()}점
        </p>
      </div>
    </div>
  )
}

function RankingScreen({
  participants,
  myId,
}: {
  participants: { id: string; name: string; class_name: string; score: number }[]
  myId: string
}) {
  const sorted = [...participants].sort((a, b) => b.score - a.score)
  const myRank = sorted.findIndex((p) => p.id === myId) + 1
  const me = sorted.find((p) => p.id === myId)

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 px-4 pt-6 pb-4 text-center border-b border-gray-100">
        <p className="text-gray-500 text-sm">현재 순위</p>
        <p className="text-gray-900 text-4xl font-extrabold mt-1">{myRank > 0 ? `${myRank}위` : '-'}</p>
        {me && (
          <p className="text-gray-500 text-sm mt-1">{me.name} &middot; {me.score.toLocaleString()}점</p>
        )}
      </div>

      {/* Ranking list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-1">
          {sorted.map((p, i) => {
            const rank = i + 1
            const isMe = p.id === myId
            return (
              <div
                key={p.id}
                className="flex items-center rounded-lg px-4 py-3"
                style={{
                  backgroundColor: isMe ? '#EFF6FF' : 'transparent',
                  fontWeight: isMe ? 700 : 400,
                }}
              >
                <span className="w-8 text-center text-gray-500 font-bold text-base shrink-0">
                  {rank}
                </span>
                <span className={`flex-1 ml-3 truncate ${isMe ? 'text-blue-600' : 'text-gray-900'}`}>
                  {p.name}
                </span>
                <span className={`font-bold tabular-nums shrink-0 ${isMe ? 'text-blue-600' : 'text-gray-600'}`}>
                  {p.score.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Ready Screen (countdown) ────────────────────────────── */

function ReadyScreen({ questionIndex, totalQuestions, playSfx }: { questionIndex: number; totalQuestions: number; playSfx: (name: import('../lib/audio/SoundSynthesizer').SfxName) => void }) {
  const [count, setCount] = useState(5)

  useEffect(() => {
    setCount(3)
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [questionIndex])

  // Countdown tick sound
  useEffect(() => {
    if (count > 0) playSfx('countdownTick')
  }, [count]) // eslint-disable-line react-hooks/exhaustive-deps

  const progressRatio = count / 3

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
      <p className="text-gray-500 text-sm tracking-wider uppercase mb-2">다음 문제 준비</p>
      <p className="text-gray-400 text-xs mb-8">Q{questionIndex + 1} / {totalQuestions}</p>

      {/* Large countdown number */}
      <span className="text-8xl font-extrabold text-gray-900 tabular-nums mb-8">
        {count}
      </span>

      {/* Progress bar */}
      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progressRatio * 100}%`,
            background: 'linear-gradient(90deg, #EAB308, #EF4444)',
            transition: 'width 0.9s linear',
          }}
        />
      </div>

      <p className="text-gray-400 text-sm mt-6">준비하세요!</p>
    </div>
  )
}

/* ── Main PlayPage ────────────────────────────────────────── */

export default function PlayPage() {
  const sessionId = localStorage.getItem('quiz_session_id') || undefined
  const participantId = localStorage.getItem('quiz_participant_id') || ''

  const { session, participants, myData, submitAnswer } = useQuizSession({
    sessionId,
  })

  // Theme is loaded for CSS variable application (side effect)
  useTheme(session?.quiz_set_id)
  const { playSfx } = useAudio()

  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const lastQuestionRef = useRef<number>(-1)

  // 퀴즈세트별 참가자 화면 설정 (reserved for future customization)
  const [, setPlayerBgImage] = useState<string | null>(null)
  const [, setQuestionTextColor] = useState('#FFFFFF')

  useEffect(() => {
    if (!session?.quiz_set_id) return
    ;(async () => {
      // 문항 로드
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
      // 참가자 화면 설정 로드
      const { data: qs } = await supabase
        .from('quiz_sets')
        .select('player_bg_image, question_text_color')
        .eq('id', session.quiz_set_id)
        .single()
      if (qs) {
        if (qs.player_bg_image) setPlayerBgImage(qs.player_bg_image)
        if (qs.question_text_color) setQuestionTextColor(qs.question_text_color)
      }
    })()
  }, [session?.quiz_set_id])

  useEffect(() => {
    if (!session) return
    if (session.current_question !== lastQuestionRef.current) {
      setSelectedAnswer(null)
      setPointsEarned(0)
      lastQuestionRef.current = session.current_question
    }
  }, [session?.current_question, session])

  useEffect(() => {
    if (!myData || !session) return
    const currentQ = session.current_question ?? 0
    const existing = myData.answers?.find((a) => a.questionIndex === currentQ)
    if (existing && selectedAnswer === null) {
      setSelectedAnswer(existing.answerIndex)
    }
  }, [myData, session, selectedAnswer])

  const handleSubmit = useCallback(
    async (answerIndex: number, remainingTime: number) => {
      if (!session) return
      const currentQ = session.current_question ?? 0
      const question = questions[currentQ]
      if (!question) return

      setSelectedAnswer(answerIndex)
      playSfx('buttonClick')

      const isCorrect = answerIndex === question.correct_index
      const pts = calculateScore(isCorrect, remainingTime, question.time_limit)
      setPointsEarned(pts)

      await submitAnswer(currentQ, answerIndex, pts)
    },
    [session, questions, submitAnswer, myData]
  )

  /* ── Loading / error states ── */

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-white gap-4">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-400">세션 연결 중...</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-white gap-4">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-400">문제 로딩 중...</p>
      </div>
    )
  }

  const currentQ = session.current_question ?? 0
  const question = questions[currentQ]

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-white gap-4">
        <p className="text-2xl font-bold text-gray-900">퀴즈 완료!</p>
        <p className="text-gray-400">최종 점수: {myData?.score ?? 0}점</p>
      </div>
    )
  }

  /* ── Phase routing ── */

  if (session.phase === 'ended') {
    const sorted = [...participants].sort((a, b) => b.score - a.score)
    const myRank = sorted.findIndex((p) => p.id === participantId) + 1
    const me = sorted.find((p) => p.id === participantId)
    const totalCorrect = myData?.answers?.filter((a) => {
      const q = questions[a.questionIndex]
      return q && a.answerIndex === q.correct_index
    }).length ?? 0
    const totalAnswered = myData?.answers?.length ?? 0
    const totalIncorrect = totalAnswered - totalCorrect

    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        {/* Quiz title */}
        <div className="shrink-0 px-6 pt-8 pb-2 text-center">
          <p className="text-gray-500 text-sm">퀴즈 결과</p>
        </div>

        {/* Main rank display */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-gray-900 text-xl font-medium mb-2">당신은</p>
          <p className="text-gray-900 font-extrabold mb-1" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)' }}>
            {myRank > 0 ? `${myRank}위` : '-'}
          </p>
          <p className="text-gray-900 text-xl font-medium mb-1">입니다.</p>
          <p className="text-gray-500 text-lg mt-2">
            ({(me?.score ?? 0).toLocaleString()}점)
          </p>

          {/* Stats */}
          <div className="mt-8 text-center text-sm text-gray-500 space-y-1">
            <p>총 참가자: {participants.length}명</p>
            <p>{questions.length}문제 중, {totalCorrect}문제 정답 / {totalIncorrect}문제 오답</p>
          </div>

          {/* Capture button */}
          <button
            onClick={() => {
              // Trigger screen capture (html2canvas or native)
              try {
                // Simple approach: prompt user
                window.alert('화면을 캡쳐하려면 스크린샷 기능을 사용해주세요.')
              } catch {}
            }}
            className="mt-8 px-8 py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            화면 캡쳐
          </button>
        </div>
      </div>
    )
  }

  if (session.phase === 'ready') {
    return <ReadyScreen questionIndex={currentQ} totalQuestions={questions.length} playSfx={playSfx} />
  }

  if (session.phase === 'reveal') {
    return (
      <RevealScreen
        question={question}
        selectedIndex={selectedAnswer}
        pointsEarned={pointsEarned}
        playSfx={playSfx}
        score={myData?.score ?? 0}
        questionIndex={currentQ}
        totalQuestions={questions.length}
      />
    )
  }

  if (session.phase === 'rank') {
    return <RankingScreen participants={participants} myId={participantId} />
  }

  return (
    <QuestionScreen
      question={question}
      questionIndex={currentQ}
      score={myData?.score ?? 0}
      questionStartedAt={session.question_started_at || new Date().toISOString()}
      onSubmit={handleSubmit}
      totalQuestions={questions.length}
      playerName={myData?.name ?? ''}
    />
  )
}
