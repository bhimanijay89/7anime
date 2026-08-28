import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import './splash.css'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isCompletedRef = useRef(false)

  const videoMp4Src = '/splash.mp4'

  const handleFinish = useCallback((reason: string) => {
    if (isCompletedRef.current) return
    isCompletedRef.current = true

    console.log(`[SPLASH] handleFinish triggered by: ${reason}`)
    setIsFadingOut(true)

    setTimeout(() => {
      onComplete()
    }, 400)
  }, [onComplete])

  useLayoutEffect(() => {
    // Prevent background page scrolling while splash is active
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const videoEl = videoRef.current
    if (videoEl) {
      // Ensure muted and playsInline are explicitly set on the DOM element for instant autoplay
      videoEl.muted = true
      videoEl.playsInline = true

      const playPromise = videoEl.play()
      if (playPromise !== undefined) {
        playPromise.catch((err: unknown) => {
          const errName = err instanceof Error ? err.name : String(err)
          console.warn('[SPLASH] video.play() notice:', errName)
          // Ignore AbortError caused by React StrictMode double-mount cleanup
          if (errName === 'AbortError' || errName === 'NotAllowedError') {
            return
          }
        })
      }
    }

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <div className={`splash-overlay ${isFadingOut ? 'splash-fade-out' : ''}`} aria-hidden="true">
      <div className="splash-ambient-glow" />
      <div className="splash-video-wrapper">
        <video
          ref={videoRef}
          src={videoMp4Src}
          autoPlay
          muted
          playsInline
          preload="auto"
          controls={false}
          className="splash-video"
          onEnded={() => {
            console.log('[SPLASH] video onEnded event fired')
            handleFinish('video-ended')
          }}
          onError={(e) => {
            console.error('[SPLASH] video onError event fired:', e)
            handleFinish('video-error')
          }}
        >
          <source src={videoMp4Src} type="video/mp4" />
        </video>
      </div>
    </div>
  )
}
