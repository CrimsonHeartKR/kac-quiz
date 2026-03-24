/**
 * ThemedBackground — 레이어 기반 배경 컴포넌트
 *
 * Layer 1: 배경 이미지 (있으면 표시)
 * Layer 2: 오버레이 (가독성 보장)
 * Layer 3: children (UI 요소)
 */
interface Props {
  bgImage?: string | null
  bgColor?: string
  overlayOpacity?: number
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
}

export default function ThemedBackground({
  bgImage,
  bgColor,
  overlayOpacity = 0.55,
  className = '',
  children,
  style,
}: Props) {
  const baseBg = bgColor || '#090D1A'

  return (
    <div className={className} style={{ backgroundColor: baseBg, position: className.includes('fixed') ? undefined : 'relative', ...style }}>
      {/* Layer 1: Background image */}
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}

      {/* Layer 2: Overlay for readability */}
      {bgImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        />
      )}

      {/* Layer 3: UI content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}
