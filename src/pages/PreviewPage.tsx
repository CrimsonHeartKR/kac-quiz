import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const BUTTON_COLORS = [
  { bg: '#EF4444', label: 'A' },
  { bg: '#3B82F6', label: 'B' },
  { bg: '#F59E0B', label: 'C' },
  { bg: '#10B981', label: 'D' },
]

const TIMER_RADIUS = 22
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS

export default function PreviewPage() {
  const [searchParams] = useSearchParams()
  const urlMode = searchParams.get('mode')
  const [mode] = useState<'text' | 'ox'>(urlMode === 'ox' ? 'ox' : 'text')

  const textQuestion = {
    question_text: '대한민국의 수도는 어디일까요?',
    options: ['서울', '부산', '대전', '인천'],
    time_limit: 20,
  }

  const oxQuestion = {
    question_text: '지구는 태양 주위를 공전한다.',
    time_limit: 15,
  }

  const remaining = mode === 'text' ? 14 : 10
  const timeLimit = mode === 'text' ? textQuestion.time_limit : oxQuestion.time_limit
  const ratio = remaining / timeLimit
  const dashOffset = TIMER_CIRCUMFERENCE * (1 - ratio)
  const questionText = mode === 'text' ? textQuestion.question_text : oxQuestion.question_text

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header — 고정 높이 */}
      <div className="flex items-center justify-between px-4 shrink-0" style={{ height: '52px' }}>
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-base shadow-lg shadow-blue-600/30">
          {mode === 'text' ? 1 : 2}
        </span>
        <div className="relative flex items-center justify-center">
          <svg width="44" height="44" className="-rotate-90">
            <circle cx="22" cy="22" r={TIMER_RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
            <circle cx="22" cy="22" r={TIMER_RADIUS} fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={TIMER_CIRCUMFERENCE} strokeDashoffset={dashOffset} />
          </svg>
          <span className="absolute text-sm font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{remaining}</span>
        </div>
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold text-xs">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.92 5.32L10 13.27l-4.78 2.44.92-5.32L2.27 6.62l5.34-.78z" />
          </svg>
          850
        </span>
      </div>

      {/* Question area — 남은 공간의 상단 */}
      <div className="flex-1 flex items-center justify-center px-5 min-h-0">
        <p className="text-center text-lg font-semibold leading-relaxed">{questionText}</p>
      </div>

      {/* Answer buttons — 하단 고정 */}
      {mode === 'ox' ? (
        <div className="shrink-0 grid grid-cols-2 gap-3 px-3 pt-2 pb-3" style={{ height: '120px' }}>
          {['O', 'X'].map((label, idx) => {
            const color = idx === 0 ? '#3B82F6' : '#EF4444'
            return (
              <button key={idx}
                className="flex items-center justify-center rounded-2xl text-white font-extrabold active:scale-[0.97] transition-all"
                style={{ backgroundColor: color, boxShadow: `0 2px 8px ${color}40`, fontSize: 'clamp(2rem, 8vw, 3rem)' }}>
                {label}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="shrink-0 grid grid-cols-2 grid-rows-2 gap-2 px-2.5 pt-1 pb-2.5" style={{ height: '200px' }}>
          {textQuestion.options.map((opt, idx) => {
            const color = BUTTON_COLORS[idx]
            return (
              <button key={idx}
                className="relative flex items-center rounded-xl text-white font-semibold text-left overflow-hidden active:scale-[0.97] transition-all"
                style={{ backgroundColor: color.bg, boxShadow: `0 2px 8px ${color.bg}40` }}>
                <span className="flex items-center justify-center w-9 h-full text-xl shrink-0"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", opacity: 0.8 }}>{color.label}</span>
                <span className="w-px h-7 bg-white/30 shrink-0" />
                <span className="flex-1 px-2.5 py-2 text-sm leading-tight line-clamp-2">{opt}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
