import { useCallback, useEffect, useRef, useState } from 'react'
import logoImg from '../../public/logo.png'
import './splash.css'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const isCompletedRef = useRef(false)

  const handleFinish = useCallback(() => {
    if (isCompletedRef.current) return
    isCompletedRef.current = true

    setIsFadingOut(true)

    setTimeout(() => {
      onComplete()
    }, 400)
  }, [onComplete])

  useEffect(() => {
    // Prevent background page scrolling while splash is active
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Clean lightweight display timer before smooth fade-out
    const timer = setTimeout(() => {
      handleFinish()
    }, 600)

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = originalOverflow
    }
  }, [handleFinish])

  return (
    <div className={`splash-overlay ${isFadingOut ? 'splash-fade-out' : ''}`} aria-hidden="true">
      <div className="splash-ambient-glow" />
      <div className="splash-content-wrapper">
        <img
          src={logoImg}
          alt="7anime"
          className="splash-logo"
        />
      </div>
    </div>
  )
}

