import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentOperator } from '../lib/auth'
import DashboardLayout from '../components/DashboardLayout'

interface QuizSet {
  id: string
  title: string
  description: string | null
  created_at: string
}

interface QuizSetWithMeta extends QuizSet {
  questionCount: number
  lastSessionDate: string | null
}

export default function HostSelectPage() {
  const navigate = useNavigate()
  const [quizSets, setQuizSets] = useState<QuizSetWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Auth check
  useEffect(() => {
    const op = getCurrentOperator()
    if (!op) navigate('/admin/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    fetchQuizSets()
  }, [])

  async function fetchQuizSets() {
    setLoading(true)
    setError('')

    const { data: sets, error: setsError } = await supabase
      .from('quiz_sets')
      .select('*')
      .order('created_at', { ascending: false })

    if (setsError || !sets) {
      setError('퀴즈 세트를 불러오는데 실패했습니다.')
      setLoading(false)
      return
    }

    const enriched: QuizSetWithMeta[] = await Promise.all(
      sets.map(async (set: QuizSet) => {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_set_id', set.id)

        const { data: recentSession } = await supabase
          .from('sessions')
          .select('started_at')
          .eq('quiz_set_id', set.id)
          .order('started_at', { ascending: false })
          .limit(1)

        return {
          ...set,
          questionCount: count ?? 0,
          lastSessionDate: recentSession?.[0]?.started_at ?? null,
        }
      })
    )

    setQuizSets(enriched)
    setLoading(false)
  }

  async function generateUniquePin(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const pin = String(Math.floor(Math.random() * 9000) + 1000)
      const { data } = await supabase
        .from('sessions')
        .select('id')
        .eq('pin', pin)
        .neq('phase', 'ended')
        .limit(1)

      if (!data || data.length === 0) return pin
    }
    throw new Error('PIN 생성에 실패했습니다.')
  }

  async function handleSelect(quizSet: QuizSetWithMeta) {
    if (creating) return
    setCreating(quizSet.id)
    setError('')

    try {
      const pin = await generateUniquePin()

      const operator = getCurrentOperator()
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          quiz_set_id: quizSet.id,
          pin,
          phase: 'lobby',
          host_user_id: operator?.id || null,
        })
        .select('id')
        .single()

      if (sessionError || !session) {
        throw new Error('세션 생성에 실패했습니다.')
      }

      navigate(`/host/lobby?sessionId=${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setCreating(null)
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '기록 없음'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <DashboardLayout role="host">
      <div className="max-w-[1200px] mx-auto">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">퀴즈 진행</h1>
          <p className="text-sm text-gray-500 mt-2">진행할 퀴즈를 선택하세요. 선택하면 새로운 세션이 생성됩니다.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <svg className="h-8 w-8 mb-4 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-400">퀴즈 세트를 불러오는 중...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && quizSets.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center bg-gray-100">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-1">퀴즈 세트가 없습니다</p>
            <p className="text-sm text-gray-400">관리자 페이지에서 퀴즈를 먼저 생성해주세요.</p>
          </div>
        )}

        {/* Quiz cards grid */}
        {!loading && quizSets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizSets.map((set) => (
              <button
                key={set.id}
                onClick={() => handleSelect(set)}
                disabled={creating !== null}
                className="bg-white rounded-xl border border-gray-200 p-7 text-left cursor-pointer disabled:cursor-wait hover:border-blue-300 hover:shadow-lg transition-all"
              >
                {/* Card content */}
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {creating === set.id && (
                    <svg className="h-5 w-5 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>

                <h3 className="text-gray-900 font-semibold text-lg mb-1 truncate">{set.title}</h3>
                {set.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {set.description}
                  </p>
                )}
                {!set.description && <div className="mb-4" />}

                {/* Meta info */}
                <div className="flex items-center gap-5 pt-5 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="text-xs text-gray-500">{set.questionCount}문항</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-gray-500">{formatDate(set.lastSessionDate)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
