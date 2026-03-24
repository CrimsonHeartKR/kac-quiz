import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Session {
  id: string
  quiz_set_id: string
  pin: string
  phase: string
  current_question: number
  started_at: string
  ended_at: string | null
  question_started_at: string | null
}

export interface Participant {
  id: string
  session_id: string
  name: string
  class_name: string
  score: number
  answers: Array<{ questionIndex: number; answerIndex: number; timestamp: string }>
  joined_at: string
}

interface UseQuizSessionOptions {
  sessionId?: string
  pin?: string
}

export function useQuizSession(options: UseQuizSessionOptions = {}) {
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myData, setMyData] = useState<Participant | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const myIdRef = useRef<string | null>(localStorage.getItem('quiz_participant_id'))

  // 세션 로드
  const loadSession = useCallback(async (sessionId?: string, pin?: string) => {
    let query = supabase.from('sessions').select('*')
    if (sessionId) {
      query = query.eq('id', sessionId)
    } else if (pin) {
      query = query.eq('pin', pin)
    } else {
      // 진행 중인 세션 찾기
      query = query.neq('phase', 'ended').order('started_at', { ascending: false }).limit(1)
    }
    const { data } = await query.single()
    if (data) setSession(data as Session)
    return data as Session | null
  }, [])

  // 참가자 목록 로드
  const loadParticipants = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })
    if (data) {
      setParticipants(data as Participant[])
      if (myIdRef.current) {
        const me = data.find((p) => p.id === myIdRef.current)
        if (me) setMyData(me as Participant)
      }
    }
  }, [])

  // Realtime 구독
  useEffect(() => {
    if (!session?.id) return

    loadParticipants(session.id)

    const channel = supabase
      .channel(`quiz:session_${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          if (payload.new) setSession(payload.new as Session)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        () => {
          loadParticipants(session.id)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [session?.id, loadParticipants])

  // 초기 로드
  useEffect(() => {
    loadSession(options.sessionId, options.pin)
  }, [options.sessionId, options.pin, loadSession])

  // 세션 참가
  const joinSession = useCallback(async (name: string, className: string) => {
    if (!session?.id) return null
    const { data, error } = await supabase
      .from('participants')
      .insert({ session_id: session.id, name, class_name: className })
      .select()
      .single()
    if (error) throw error
    if (data) {
      myIdRef.current = data.id
      setMyData(data as Participant)
      localStorage.setItem('quiz_participant_id', data.id)
      localStorage.setItem('quiz_session_id', session.id)
    }
    return data as Participant
  }, [session?.id])

  // 답변 제출 (점수 포함)
  const submitAnswer = useCallback(async (questionIndex: number, answerIndex: number, points: number = 0) => {
    const id = myIdRef.current
    if (!id) return
    // DB에서 최신 데이터를 가져와서 업데이트
    const { data: current } = await supabase
      .from('participants')
      .select('score, answers')
      .eq('id', id)
      .single()
    if (!current) return
    const currentAnswers = (current.answers as Array<Record<string, unknown>>) || []
    const newAnswers = [...currentAnswers, { questionIndex, answerIndex, timestamp: new Date().toISOString() }]
    const newScore = (current.score || 0) + points
    await supabase
      .from('participants')
      .update({ answers: newAnswers, score: newScore })
      .eq('id', id)
  }, [])

  // 진행자 전용 메서드들
  const advancePhase = useCallback(async (newPhase: string) => {
    if (!session?.id) return
    const update: Record<string, unknown> = { phase: newPhase }
    if (newPhase === 'play') {
      update.question_started_at = new Date().toISOString()
    }
    await supabase.from('sessions').update(update).eq('id', session.id)
  }, [session?.id])

  const revealAnswer = useCallback(async () => {
    await advancePhase('reveal')
  }, [advancePhase])

  const nextQuestion = useCallback(async () => {
    if (!session?.id) return
    // 먼저 ready phase로 전환 (5초 카운트다운)
    await supabase
      .from('sessions')
      .update({
        current_question: (session.current_question || 0) + 1,
        phase: 'ready',
        question_started_at: null,
      })
      .eq('id', session.id)
  }, [session?.id, session?.current_question])

  // ready → play 전환 (카운트다운 후 호출)
  const startQuestion = useCallback(async () => {
    if (!session?.id) return
    await supabase
      .from('sessions')
      .update({
        phase: 'play',
        question_started_at: new Date().toISOString(),
      })
      .eq('id', session.id)
  }, [session?.id])

  const showRanking = useCallback(async () => {
    await advancePhase('rank')
  }, [advancePhase])

  const endSession = useCallback(async () => {
    if (!session?.id) return
    await supabase
      .from('sessions')
      .update({ phase: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.id)
  }, [session?.id])

  return {
    session,
    participants,
    myData,
    loadSession,
    joinSession,
    submitAnswer,
    advancePhase,
    revealAnswer,
    nextQuestion,
    startQuestion,
    showRanking,
    endSession,
  }
}
