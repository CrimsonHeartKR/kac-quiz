import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  fallback: React.ReactNode
  className?: string
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
}

/**
 * LottieAnimation — Uses lottie-web directly via dynamic import to avoid ESM interop issues.
 * Falls back gracefully when src is empty or load fails.
 */
export default function LottieAnimation({
  src,
  fallback,
  className = '',
  loop = true,
  autoplay = true,
  style,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<unknown>(null)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!src || !containerRef.current) {
      setLoaded(false)
      return
    }

    let cancelled = false
    setFailed(false)
    setLoaded(false)

    // Fetch animation data, then dynamically import lottie-web
    Promise.all([
      fetch(src).then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      }),
      import('lottie-web'),
    ])
      .then(([animationData, lottieModule]) => {
        if (cancelled || !containerRef.current) return

        // Resolve ESM/CJS interop: lottie-web may be { default: { default: fn } } or { default: { loadAnimation: fn } }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let lottieApi: any = lottieModule
        // Unwrap .default until we find loadAnimation
        while (lottieApi && typeof lottieApi.loadAnimation !== 'function' && lottieApi.default) {
          lottieApi = lottieApi.default
        }

        if (typeof lottieApi?.loadAnimation !== 'function') {
          throw new Error('lottie-web loadAnimation not found')
        }

        // Clear previous
        containerRef.current.innerHTML = ''

        const anim = lottieApi.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay,
          animationData,
        })
        animRef.current = anim
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (animRef.current && typeof (animRef.current as any).destroy === 'function') {
        ;(animRef.current as { destroy: () => void }).destroy()
        animRef.current = null
      }
    }
  }, [src, loop, autoplay])

  if (!src || failed) {
    return <>{fallback}</>
  }

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        style={style}
      />
      {!loaded && <>{fallback}</>}
    </>
  )
}
