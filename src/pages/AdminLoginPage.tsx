import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginOperator } from '../lib/auth'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'admin' | 'host' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const operator = await loginOperator(email, password)

      if (role === 'admin' && operator.role !== 'admin') {
        setError('관리자 권한이 없습니다.')
        setLoading(false)
        return
      }

      navigate(role === 'admin' ? '/admin' : '/host')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  // Role selection screen
  if (!role) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight">KAC Quiz</span>
            </div>
            <p className="text-gray-500 text-sm">관리 시스템에 오신 것을 환영합니다</p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <button
              onClick={() => setRole('admin')}
              className="group bg-white rounded-xl border border-gray-200 p-7 text-left transition-all hover:border-blue-300 hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 mb-4 group-hover:bg-indigo-100 transition-colors">
                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-gray-900 text-lg font-bold mb-1">관리자</h2>
              <p className="text-gray-400 text-xs leading-relaxed">퀴즈 생성 · 운영자 관리 · 운영 로그 확인</p>
            </button>

            <button
              onClick={() => setRole('host')}
              className="group bg-white rounded-xl border border-gray-200 p-7 text-left transition-all hover:border-blue-300 hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 mb-4 group-hover:bg-amber-100 transition-colors">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </div>
              <h2 className="text-gray-900 text-lg font-bold mb-1">운영자</h2>
              <p className="text-gray-400 text-xs leading-relaxed">퀴즈 실행 · 참가자 관리 · 실시간 진행</p>
            </button>
          </div>

          <div className="text-center mt-8">
            <button onClick={() => navigate('/')} className="text-gray-400 text-xs hover:text-gray-600 transition-colors">
              참가자로 입장하기 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Login form
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-sm p-9">
        <button onClick={() => setRole(null)} className="flex items-center gap-1 text-gray-400 text-sm hover:text-gray-700 transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>

        <div className="text-center mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 ${
            role === 'admin'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            {role === 'admin' ? '관리자' : '운영자'}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com"
                   className="w-full rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********"
                   className="w-full rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white" />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
                  className={`mt-2 w-full rounded-lg py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 ${
                    role === 'admin'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
