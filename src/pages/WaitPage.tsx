import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizSession } from '../hooks/useQuizSession'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import ThemedBackground from '../components/ThemedBackground'
import LottieAnimation from '../components/LottieAnimation'

export default function WaitPage() {
  const navigate = useNavigate()
  const sessionId = localStorage.getItem('quiz_session_id') || undefined
  const participantId = localStorage.getItem('quiz_participant_id') || undefined

  const { session, participants } = useQuizSession({ sessionId })
  const theme = useTheme(session?.quiz_set_id)

  const [myName, setMyName] = useState('')
  const [myClass, setMyClass] = useState('')
  const [quizTitle, setQuizTitle] = useState('')

  useEffect(() => {
    if (!participantId) return
    const load = async () => {
      const { data } = await supabase
        .from('participants')
        .select('name, class_name')
        .eq('id', participantId)
        .single()
      if (data) {
        setMyName(data.name)
        setMyClass(data.class_name)
      }
    }
    load()
  }, [participantId])

  useEffect(() => {
    if (!session?.quiz_set_id) return
    const load = async () => {
      const { data } = await supabase
        .from('quiz_sets')
        .select('title')
        .eq('id', session.quiz_set_id)
        .single()
      if (data) setQuizTitle(data.title)
    }
    load()
  }, [session?.quiz_set_id])

  useEffect(() => {
    if (session?.phase === 'play' || session?.phase === 'ready') {
      navigate('/play')
    }
  }, [session?.phase, navigate])

  return (
    <ThemedBackground
      bgImage={theme.bgImageWait || null}
      className="flex flex-col items-center justify-center min-h-dvh px-4 overflow-hidden"
    >
      {/* Quiz title */}
      {quizTitle && (
        <p className="text-white/60 text-sm tracking-wide mb-6">{quizTitle}</p>
      )}

      {/* Participant count */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <span className="text-white/50 text-sm font-medium tracking-widest uppercase">
          참가자
        </span>
        <span className="text-white text-8xl font-extrabold tabular-nums leading-none">
          {participants.length}
        </span>
      </div>

      {/* Lottie waiting animation */}
      <LottieAnimation
        src="/lottie/waiting.json"
        fallback={
          <div className="flex items-center gap-2">
            {[0, 300, 600].map((delay) => (
              <span
                key={delay}
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: theme.primaryColor, animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        }
        className="w-24 h-24 mb-6"
        loop
        autoplay
      />

      {/* Waiting message */}
      <p className="text-white/40 text-sm mb-12">
        호스트가 퀴즈를 시작할 때까지 기다려 주세요
      </p>

      {/* My info card */}
      {(myName || myClass) && (
        <div className="w-full max-w-xs rounded-2xl border px-5 py-4"
          style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-base font-semibold">{myName}</p>
              <p className="text-white/50 text-xs mt-0.5">{myClass}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${theme.primaryColor}33` }}>
              <span className="text-lg font-bold" style={{ color: theme.primaryColor }}>
                {myName.charAt(0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </ThemedBackground>
  )
}
