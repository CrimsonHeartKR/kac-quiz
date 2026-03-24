import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface JoinConfig {
  quizTitle: string
  bgImage: string | null
  fieldLabel: string
  fieldPlaceholder: string
  primaryColor: string
  accentColor: string
}

const DEFAULT_CONFIG: JoinConfig = {
  quizTitle: '퀴즈',
  bgImage: null,
  fieldLabel: '이름',
  fieldPlaceholder: '이름을 입력하세요',
  primaryColor: '#1A3A6B',
  accentColor: '#E8A020',
}

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pinFromUrl = searchParams.get('pin') || ''

  const [step, setStep] = useState<'pin' | 'join'>(pinFromUrl ? 'join' : 'pin')
  const [pin, setPin] = useState(pinFromUrl)
  const [name, setName] = useState('')

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [config, setConfig] = useState<JoinConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (pinFromUrl) {
      lookupPin(pinFromUrl)
    }
  }, [pinFromUrl])

  async function lookupPin(pinCode: string) {
    setLoading(true)
    setError('')

    const { data: sess } = await supabase
      .from('sessions')
      .select('id, quiz_set_id, phase')
      .eq('pin', pinCode)
      .neq('phase', 'ended')
      .single()

    if (!sess) {
      setError('유효하지 않은 PIN 코드입니다. 다시 확인해주세요.')
      setStep('pin')
      setLoading(false)
      return
    }

    const { data: qs } = await supabase
      .from('quiz_sets')
      .select('title, join_bg_image, field1_label, field1_placeholder, theme_config')
      .eq('id', sess.quiz_set_id)
      .single()

    const tc = qs?.theme_config as Record<string, string> | null
    setSessionId(sess.id)
    setConfig({
      quizTitle: qs?.title || '퀴즈',
      bgImage: qs?.join_bg_image || null,
      fieldLabel: qs?.field1_label || '이름',
      fieldPlaceholder: qs?.field1_placeholder || '이름을 입력하세요',
      primaryColor: tc?.primaryColor || '#1A3A6B',
      accentColor: tc?.accentColor || '#E8A020',
    })
    setStep('join')
    setLoading(false)
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.trim().length < 4) {
      setError('4자리 PIN 코드를 입력해주세요.')
      return
    }
    lookupPin(pin.trim())
  }

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !sessionId) return

    setSubmitting(true)
    setError('')

    try {
      const { data, error: insertError } = await supabase
        .from('participants')
        .insert({ session_id: sessionId, name: name.trim() })
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        localStorage.setItem('quiz_participant_id', data.id)
        localStorage.setItem('quiz_session_id', sessionId)
      }

      navigate('/wait')
    } catch {
      setError('참가에 실패했습니다. 다시 시도해주세요.')
      setSubmitting(false)
    }
  }

  const spinnerIcon = (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: config.primaryColor }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">KAC Quiz</span>
          </div>
          <p className="text-gray-500 text-sm">실시간 퀴즈에 참가하세요</p>
        </div>

        {/* Step 1: PIN 입력 */}
        {step === 'pin' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{ backgroundColor: `${config.primaryColor}14` }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke={config.primaryColor} strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">참가 코드 입력</h2>
              <p className="text-sm text-gray-400">운영자에게 안내받은 4자리 PIN을 입력하세요</p>
            </div>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-5">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      const newPin = pin.split('')
                      newPin[i] = val
                      setPin(newPin.join(''))
                      if (val && i < 3) {
                        const next = e.target.nextElementSibling as HTMLInputElement
                        next?.focus()
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !pin[i] && i > 0) {
                        const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                        prev?.focus()
                      }
                    }}
                    className="w-16 h-20 text-center text-3xl font-bold text-gray-900 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:border-blue-400 bg-gray-50 transition-colors"
                    style={{ '--tw-ring-color': `${config.primaryColor}33` } as React.CSSProperties}
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button type="submit" disabled={pin.length < 4 || loading}
                className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:brightness-110"
                style={{ backgroundColor: config.primaryColor }}>
                {loading ? (
                  <span className="inline-flex items-center gap-2 justify-center">{spinnerIcon} 확인 중...</span>
                ) : '참가하기'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: 입력 — 1개 필드 */}
        {step === 'join' && (
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-gray-200">
            {config.bgImage ? (
              <>
                <div className="absolute inset-0">
                  <img src={config.bgImage} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="relative z-10 p-6 pt-16 flex flex-col min-h-[420px]">
                  {/* 상단 퀴즈 정보 */}
                  <div className="text-center mb-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-medium text-white">진행 중인 퀴즈</span>
                    </div>
                    <h2 className="text-xl font-bold text-white drop-shadow-lg">{config.quizTitle}</h2>
                  </div>

                  {/* 하단 입력 폼 — 흰색 박스 */}
                  <div className="bg-white rounded-2xl p-6 shadow-xl">
                    <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">{config.fieldLabel}</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                          placeholder={config.fieldPlaceholder} maxLength={20}
                          className="w-full px-4 py-3 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                      </div>

                      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                      <button type="submit" disabled={!name.trim() || submitting}
                        className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:brightness-110"
                style={{ backgroundColor: config.primaryColor }}>
                        {submitting ? (
                          <span className="inline-flex items-center gap-2 justify-center">{spinnerIcon} 참가 중...</span>
                        ) : '참가하기'}
                      </button>

                      <button type="button" onClick={() => { setStep('pin'); setPin(''); setSessionId(null); setError('') }}
                        className="text-gray-400 text-xs hover:text-gray-600 transition-colors text-center">
                        다른 PIN으로 참가하기
                      </button>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-700">진행 중인 퀴즈</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{config.quizTitle}</h2>
                  <p className="text-sm text-gray-400">참가 정보를 입력해주세요</p>
                </div>

                <form onSubmit={handleJoinSubmit} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">{config.fieldLabel}</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder={config.fieldPlaceholder} maxLength={20}
                      className="w-full px-4 py-3 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 transition-colors" />
                  </div>

                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                  <button type="submit" disabled={!name.trim() || submitting}
                    className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:brightness-110"
                style={{ backgroundColor: config.primaryColor }}>
                    {submitting ? (
                      <span className="inline-flex items-center gap-2 justify-center">{spinnerIcon} 참가 중...</span>
                    ) : '참가하기'}
                  </button>

                  <button type="button" onClick={() => { setStep('pin'); setPin(''); setSessionId(null); setError('') }}
                    className="text-gray-400 text-xs hover:text-gray-600 transition-colors">
                    다른 PIN으로 참가하기
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 관리자 링크 */}
        <div className="text-center mt-8">
          <button onClick={() => navigate('/admin/login')} className="text-gray-400 text-xs hover:text-gray-600 transition-colors">
            관리자 / 운영자 로그인 →
          </button>
        </div>
      </div>
    </div>
  )
}
