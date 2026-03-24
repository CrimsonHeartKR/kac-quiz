import { getTimerColor } from '../lib/theme'
import type { ThemeConfig } from '../lib/theme'
import LottieAnimation from './LottieAnimation'

interface Props {
  remaining: number
  timeLimit: number
  theme: ThemeConfig
  /** SVG size in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Show Lottie background */
  showLottie?: boolean
  className?: string
}

export default function TimerCircle({
  remaining,
  timeLimit,
  theme,
  size = 96,
  strokeWidth = 6,
  showLottie = false,
  className = '',
}: Props) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = timeLimit > 0 ? remaining / timeLimit : 0
  const dashOffset = circumference * (1 - ratio)
  const color = getTimerColor(theme, ratio)
  const center = size / 2

  const fontSize = size < 64 ? 'text-sm' : size < 100 ? 'text-2xl' : 'text-3xl'

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {showLottie && theme.lottieTimer && (
        <div className="absolute inset-0 opacity-20">
          <LottieAnimation src={theme.lottieTimer} fallback={null} className="w-full h-full" loop autoplay />
        </div>
      )}
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke 0.3s' }}
        />
      </svg>
      <span className={`absolute ${fontSize} font-bold tabular-nums`} style={{ color }}>
        {Math.ceil(remaining)}
      </span>
    </div>
  )
}
