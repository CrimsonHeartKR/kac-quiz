import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentOperator, createOperator, toggleOperatorActive, deleteOperator, type Operator } from '../lib/auth'
import DashboardLayout from '../components/DashboardLayout'

interface QuizSet { id: string; title: string; created_at: string }
interface QuizSetRow extends QuizSet { questionCount: number; lastSessionDate: string | null }
interface SessionLog {
  id: string
  quiz_title: string
  pin: string
  phase: string
  host_name: string
  host_email: string
  started_at: string
  ended_at: string | null
  participant_count: number
}

type Tab = 'quizzes' | 'operators' | 'logs'

export default function AdminPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlTab = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(urlTab || 'quizzes')

  useEffect(() => {
    const op = getCurrentOperator()
    if (!op || op.role !== 'admin') {
      navigate('/admin/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (urlTab && ['quizzes', 'operators', 'logs'].includes(urlTab)) {
      setTab(urlTab)
    } else if (!urlTab) {
      setTab('quizzes')
    }
  }, [urlTab])

  function switchTab(t: Tab) {
    setTab(t)
    navigate(t === 'quizzes' ? '/admin' : `/admin?tab=${t}`, { replace: true })
  }

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'quizzes', label: '퀴즈 관리', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> },
    { key: 'operators', label: '운영자 관리', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { key: 'logs', label: '운영 로그', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> },
  ]

  return (
    <DashboardLayout role="admin" activeTab={tab}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <span className="text-gray-500 hover:text-gray-700 cursor-pointer" onClick={() => switchTab('quizzes')}>홈</span>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        <span className="text-gray-700 font-medium">{tabs.find(t => t.key === tab)?.label}</span>
      </div>

      {/* Page header with tabs */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1.5">
          {tabs.map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'quizzes' && <QuizzesTab navigate={navigate} />}
      {tab === 'operators' && <OperatorsTab />}
      {tab === 'logs' && <LogsTab />}
    </DashboardLayout>
  )
}

/* ================================================================
   퀴즈 관리 탭
   ================================================================ */
function QuizzesTab({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [quizSets, setQuizSets] = useState<QuizSetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchQuizSets() }, [])

  async function fetchQuizSets() {
    setLoading(true)
    setError('')
    const { data: sets } = await supabase.from('quiz_sets').select('*').order('created_at', { ascending: false })
    if (!sets) { setLoading(false); return }
    const enriched: QuizSetRow[] = await Promise.all(sets.map(async (s: QuizSet) => {
      const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('quiz_set_id', s.id)
      const { data: rs } = await supabase.from('sessions').select('started_at').eq('quiz_set_id', s.id).order('started_at', { ascending: false }).limit(1)
      return { ...s, questionCount: count ?? 0, lastSessionDate: rs?.[0]?.started_at ?? null }
    }))
    setQuizSets(enriched)
    setLoading(false)
  }

  async function handleDuplicate(set: QuizSetRow) {
    const { data: newSet } = await supabase.from('quiz_sets').insert({ title: `${set.title} (복사본)` }).select('id').single()
    if (!newSet) return
    const { data: questions } = await supabase.from('questions').select('*').eq('quiz_set_id', set.id)
    if (questions?.length) {
      await supabase.from('questions').insert(questions.map((q: Record<string, unknown>) => ({
        quiz_set_id: newSet.id, order_num: q.order_num, slide_image_url: q.slide_image_url,
        question_text: q.question_text, question_type: q.question_type || 'text',
        options: q.options, option_images: q.option_images || [], correct_index: q.correct_index, time_limit: q.time_limit,
      })))
    }
    fetchQuizSets()
  }

  async function handleDelete(set: QuizSetRow) {
    if (!window.confirm(`"${set.title}" 퀴즈 세트를 삭제하시겠습니까?`)) return
    await supabase.from('quiz_sets').delete().eq('id', set.id)
    fetchQuizSets()
  }

  function fmtDate(d: string) { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) }
  function fmtSession(d: string | null) {
    if (!d) return '-'
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return '오늘'; if (diff === 1) return '어제'; if (diff < 7) return `${diff}일 전`
    return fmtDate(d)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">퀴즈 세트</h2>
          <p className="text-sm text-gray-500 mt-2">전체 {quizSets.length}건</p>
        </div>
        <button onClick={() => navigate('/admin/editor')}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          새 퀴즈 세트
        </button>
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg text-sm text-red-600 bg-red-50 border border-red-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          불러오는 중...
        </div>
      ) : quizSets.length === 0 ? (
        <div className="text-center py-20 text-gray-400">퀴즈 세트가 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">번호</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">제목</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">문항 수</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">생성일</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">최근 세션</th>
                <th className="text-center px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quizSets.map((set, i) => (
                <tr key={set.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-6 py-5 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-5 text-gray-900 font-medium">{set.title}</td>
                  <td className="px-4 py-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {set.questionCount}문항
                    </span>
                  </td>
                  <td className="px-4 py-5 text-center text-gray-500">{fmtDate(set.created_at)}</td>
                  <td className="px-4 py-5 text-center text-gray-500">{fmtSession(set.lastSessionDate)}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => navigate(`/admin/editor?id=${set.id}`)} className="px-3.5 py-2 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">편집</button>
                      <button onClick={() => handleDuplicate(set)} className="px-3.5 py-2 rounded-md text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors">복제</button>
                      <button onClick={() => handleDelete(set)} className="px-3.5 py-2 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ================================================================
   운영자 관리 탭
   ================================================================ */
function OperatorsTab() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'host' as 'admin' | 'host' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => { fetchOperators() }, [])

  async function fetchOperators() {
    setLoading(true)
    const { data } = await supabase.from('operators').select('*').order('created_at', { ascending: false })
    if (data) setOperators(data as Operator[])
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.email || !form.password || !form.name) { setFormError('모든 필드를 입력하세요.'); return }
    if (form.password.length < 6) { setFormError('비밀번호는 6자 이상이어야 합니다.'); return }
    setFormError('')
    setFormLoading(true)
    try {
      await createOperator(form.email, form.password, form.name, form.role)
      setForm({ email: '', password: '', name: '', role: 'host' })
      setShowForm(false)
      fetchOperators()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '생성 실패')
    }
    setFormLoading(false)
  }

  async function handleToggle(op: Operator) {
    await toggleOperatorActive(op.id, !op.is_active)
    fetchOperators()
  }

  async function handleDeleteOp(op: Operator) {
    if (!window.confirm(`"${op.name}" 계정을 삭제하시겠습니까?`)) return
    await deleteOperator(op.id)
    fetchOperators()
  }

  const inputClass = "w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">운영자 계정</h2>
          <p className="text-sm text-gray-500 mt-2">운영자 및 관리자 계정을 생성하고 관리합니다.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          {showForm ? '취소' : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> 계정 생성</>
          )}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">새 계정 생성</h3>
          <div className="grid grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">이름</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="홍길동" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">역할</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'host' })} className={inputClass}>
                <option value="host">운영자</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">이메일</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" type="email" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">비밀번호</label>
              <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="6자 이상" type="password" className={inputClass} />
            </div>
          </div>
          {formError && <p className="text-red-600 text-sm mb-4">{formError}</p>}
          <button onClick={handleCreate} disabled={formLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {formLoading ? '생성 중...' : '계정 생성'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">불러오는 중...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">이름</th>
                <th className="text-left px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">이메일</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">역할</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">상태</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">마지막 로그인</th>
                <th className="text-center px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {operators.map(op => (
                <tr key={op.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-6 py-5 text-gray-900 font-medium">{op.name}</td>
                  <td className="px-4 py-5 text-gray-500">{op.email}</td>
                  <td className="px-4 py-5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      op.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {op.role === 'admin' ? '관리자' : '운영자'}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      op.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {op.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-center text-gray-400 text-xs">
                    {op.last_login_at ? new Date(op.last_login_at).toLocaleString('ko-KR') : '-'}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleToggle(op)} className={`px-3.5 py-2 rounded-md text-xs font-medium ${
                        op.is_active ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                      } transition-colors`}>
                        {op.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button onClick={() => handleDeleteOp(op)} className="px-3.5 py-2 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ================================================================
   운영 로그 탭
   ================================================================ */
function LogsTab() {
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    setLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('*').order('started_at', { ascending: false }).limit(50)
    if (!sessions) { setLoading(false); return }

    const enriched: SessionLog[] = await Promise.all(sessions.map(async (s: Record<string, unknown>) => {
      const { data: qs } = await supabase.from('quiz_sets').select('title').eq('id', s.quiz_set_id).single()
      let hostName = '-', hostEmail = '-'
      if (s.host_user_id) {
        const { data: op } = await supabase.from('operators').select('name, email').eq('id', s.host_user_id).single()
        if (op) { hostName = op.name; hostEmail = op.email }
      }
      const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true }).eq('session_id', s.id)
      return {
        id: s.id as string, quiz_title: qs?.title || '(삭제됨)', pin: s.pin as string,
        phase: s.phase as string, host_name: hostName, host_email: hostEmail,
        started_at: s.started_at as string, ended_at: s.ended_at as string | null,
        participant_count: count ?? 0,
      }
    }))
    setLogs(enriched)
    setLoading(false)
  }

  function phaseLabel(phase: string) {
    const map: Record<string, { text: string; cls: string }> = {
      lobby: { text: '대기', cls: 'bg-blue-50 text-blue-700' },
      play: { text: '진행중', cls: 'bg-emerald-50 text-emerald-700' },
      reveal: { text: '정답공개', cls: 'bg-amber-50 text-amber-700' },
      rank: { text: '순위', cls: 'bg-purple-50 text-purple-700' },
      ended: { text: '종료', cls: 'bg-gray-100 text-gray-600' },
    }
    const m = map[phase] || { text: phase, cls: 'bg-gray-100 text-gray-600' }
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>{m.text}</span>
  }

  if (selectedSession) {
    return <SessionDetailView sessionId={selectedSession} onBack={() => setSelectedSession(null)} />
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">운영 로그</h2>
          <p className="text-sm text-gray-500 mt-2">퀴즈 세션 진행 기록입니다. 클릭하면 상세 결과를 확인할 수 있습니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">불러오는 중...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">아직 진행된 세션이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">퀴즈</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">PIN</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">상태</th>
                <th className="text-left px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">운영자</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">참가자</th>
                <th className="text-center px-4 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">시작일시</th>
                <th className="text-center px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-blue-50/40 transition-colors cursor-pointer" onClick={() => setSelectedSession(log.id)}>
                  <td className="px-6 py-5 text-gray-900 font-medium">{log.quiz_title}</td>
                  <td className="px-4 py-5 text-center text-gray-500 font-mono">{log.pin}</td>
                  <td className="px-4 py-5 text-center">{phaseLabel(log.phase)}</td>
                  <td className="px-4 py-5">
                    <div className="text-gray-700 text-xs font-medium">{log.host_name}</div>
                    <div className="text-gray-400 text-xs">{log.host_email}</div>
                  </td>
                  <td className="px-4 py-5 text-center text-gray-600">{log.participant_count}명</td>
                  <td className="px-4 py-5 text-center text-gray-400 text-xs">{new Date(log.started_at).toLocaleString('ko-KR')}</td>
                  <td className="px-6 py-5 text-center">
                    <button className="px-3.5 py-2 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">상세보기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ================================================================
   세션 상세 보기
   ================================================================ */
interface ParticipantDetail { id: string; name: string; class_name: string; score: number; answers: { questionIndex: number; answerIndex: number }[] }
interface QuestionDetail { order_num: number; question_text: string; question_type: string; options: string[]; correct_index: number }

function SessionDetailView({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true)
  const [sessionInfo, setSessionInfo] = useState<{ quiz_title: string; pin: string; started_at: string; ended_at: string | null } | null>(null)
  const [participants, setParticipants] = useState<ParticipantDetail[]>([])
  const [questions, setQuestions] = useState<QuestionDetail[]>([])
  const [viewTab, setViewTab] = useState<'scores' | 'accuracy'>('scores')

  useEffect(() => { loadDetail() }, [sessionId])

  async function loadDetail() {
    setLoading(true)
    const { data: sess } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    if (!sess) { setLoading(false); return }
    const { data: qs } = await supabase.from('quiz_sets').select('title').eq('id', sess.quiz_set_id).single()
    setSessionInfo({ quiz_title: qs?.title || '(삭제됨)', pin: sess.pin, started_at: sess.started_at, ended_at: sess.ended_at })

    const { data: qData } = await supabase.from('questions').select('*').eq('quiz_set_id', sess.quiz_set_id).order('order_num', { ascending: true })
    if (qData) setQuestions(qData.map((q: Record<string, unknown>) => ({
      order_num: q.order_num as number, question_text: (q.question_text as string) || '',
      question_type: (q.question_type as string) || 'text', options: (q.options as string[]) || [],
      correct_index: (q.correct_index as number) ?? 0,
    })))

    const { data: pData } = await supabase.from('participants').select('*').eq('session_id', sessionId).order('score', { ascending: false })
    if (pData) setParticipants(pData.map((p: Record<string, unknown>) => ({
      id: p.id as string, name: p.name as string, class_name: (p.class_name as string) || '',
      score: (p.score as number) || 0, answers: (p.answers as { questionIndex: number; answerIndex: number }[]) || [],
    })))
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">불러오는 중...</div>

  const questionStats = questions.map((q, qIdx) => {
    let correct = 0, total = 0
    participants.forEach(p => {
      const ans = p.answers.find(a => a.questionIndex === qIdx)
      if (ans !== undefined) { total++; if (ans.answerIndex === q.correct_index) correct++ }
    })
    return { ...q, correct, total, rate: total > 0 ? Math.round((correct / total) * 100) : 0 }
  })

  const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        목록으로
      </button>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">{sessionInfo?.quiz_title}</h2>
        <p className="text-sm text-gray-500 mt-2">
          PIN: {sessionInfo?.pin} | {sessionInfo?.started_at ? new Date(sessionInfo.started_at).toLocaleString('ko-KR') : ''}
          {sessionInfo?.ended_at ? ` ~ ${new Date(sessionInfo.ended_at).toLocaleString('ko-KR')}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1.5 mb-8 w-fit">
        <button onClick={() => setViewTab('scores')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewTab === 'scores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          최종 점수표 ({participants.length}명)
        </button>
        <button onClick={() => setViewTab('accuracy')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewTab === 'accuracy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          문항별 정답률 ({questions.length}문항)
        </button>
      </div>

      {viewTab === 'scores' && (
        participants.length === 0 ? <div className="text-center py-20 text-gray-400">참가자가 없습니다.</div> : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600 text-xs w-16">순위</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs">이름</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs">반</th>
                  {questions.map((_, qi) => (
                    <th key={qi} className="text-center px-2 py-3.5 font-semibold text-gray-600 text-xs">Q{qi + 1}</th>
                  ))}
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600 text-xs">총점</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map((p, i) => {
                  const rank = i + 1
                  const isTop3 = rank <= 3
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 text-center">
                        {isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold" style={{ backgroundColor: podiumColors[rank - 1] }}>{rank}</span>
                        ) : <span className="text-gray-400">{rank}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.class_name}</td>
                      {questions.map((q, qi) => {
                        const ans = p.answers.find(a => a.questionIndex === qi)
                        const isCorrect = ans !== undefined && ans.answerIndex === q.correct_index
                        return (
                          <td key={qi} className="px-2 py-3 text-center text-xs">
                            {ans === undefined ? <span className="text-gray-300">-</span>
                              : isCorrect ? <span className="text-emerald-600 font-bold">O</span>
                              : <span className="text-red-500 font-bold">X</span>}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-center font-bold tabular-nums" style={{ color: isTop3 ? podiumColors[rank - 1] : '#111827' }}>{p.score}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {viewTab === 'accuracy' && (
        <div className="flex flex-col gap-5">
          {questionStats.map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold">{qi + 1}</span>
                  <span className="text-gray-900 font-medium text-sm truncate max-w-md">{q.question_text || '(텍스트 없음)'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    q.question_type === 'ox' ? 'bg-emerald-50 text-emerald-700' : q.question_type === 'image' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                  }`}>{q.question_type === 'ox' ? 'OX' : q.question_type === 'image' ? '이미지' : '4지선다'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: q.rate >= 70 ? '#059669' : q.rate >= 40 ? '#D97706' : '#DC2626' }}>{q.rate}%</span>
                  <span className="text-xs text-gray-400">({q.correct}/{q.total})</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-gray-100">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${q.rate}%`,
                  backgroundColor: q.rate >= 70 ? '#059669' : q.rate >= 40 ? '#D97706' : '#DC2626',
                }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {q.options.map((opt, oi) => {
                  let optCount = 0
                  participants.forEach(p => { const ans = p.answers.find(a => a.questionIndex === qi); if (ans && ans.answerIndex === oi) optCount++ })
                  const optPct = q.total > 0 ? Math.round((optCount / q.total) * 100) : 0
                  const isCorrect = oi === q.correct_index
                  return (
                    <div key={oi} className={`flex items-center gap-3 text-xs rounded-lg px-4 py-3 border ${
                      isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'
                    }`}>
                      <span className={`font-bold w-4 ${isCorrect ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {q.question_type === 'ox' ? (oi === 0 ? 'O' : 'X') : String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1 truncate text-gray-700">{opt}</span>
                      <span className={`font-mono tabular-nums ${isCorrect ? 'text-emerald-600' : 'text-gray-400'}`}>{optCount}명 ({optPct}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
