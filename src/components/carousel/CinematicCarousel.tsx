import { ChevronLeft, ChevronRight, Pause, Play, Plus, Star } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Anime } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { Button, IconButton } from '../ui/Button'
import './rail.css'

interface Top10HeroProps {
  anime: Anime[]
  onSelect?: (anime: Anime) => void
  onAddToList?: (anime: Anime) => void
}

export function Top10Hero({ anime, onSelect, onAddToList }: Top10HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = useRef(false)

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mq.matches
    const handler = (e: MediaQueryListEvent) => { prefersReducedMotion.current = e.matches }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const goTo = useCallback((index: number) => {
    const target = ((index % anime.length) + anime.length) % anime.length
    setTransitioning(true)
    setTimeout(() => {
      setActiveIndex(target)
      setTimeout(() => setTransitioning(false), 50)
    }, prefersReducedMotion.current ? 0 : 200)
  }, [anime.length])

  // Auto-rotation (8s)
  useEffect(() => {
    if (paused || anime.length <= 1) return
    const timer = window.setInterval(() => goTo(activeIndex + 1), 8000)
    return () => window.clearInterval(timer)
  }, [paused, activeIndex, anime.length, goTo])

  // Keyboard navigation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(activeIndex + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(activeIndex - 1) }
    }
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [activeIndex, goTo])

  // Scroll active thumbnail into view
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const active = strip.children[activeIndex] as HTMLElement | undefined
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeIndex])

  const current = anime[activeIndex]
  if (!current) return null

  const rank = String(activeIndex + 1).padStart(2, '0')

  return (
    <section
      ref={containerRef}
      className={`hero-top10 ${transitioning ? 'hero-top10--transitioning' : ''}`}
      aria-roledescription="carousel"
      aria-label="Top 10 anime this week"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Background layers */}
      <div
        className="hero-top10__bg"
        style={{ backgroundImage: `url(${current.cover || current.poster})` }}
        aria-hidden="true"
      />
      <div className="hero-top10__overlay" aria-hidden="true" />

      {/* Main content */}
      <div className="hero-top10__main" aria-live="polite">
        {/* Left: metadata */}
        <div className="hero-top10__content">
          <p className="hero-top10__eyebrow">
            TOP 10 · <span>#{rank} THIS WEEK</span>
          </p>
          <h1 className="hero-top10__title">{current.title}</h1>
          <div className="hero-top10__meta">
            {current.rating && (
              <span className="hero-top10__rating">
                <Star size={14} fill="currentColor" /> {current.rating}
              </span>
            )}
            {current.type && <Badge tone="neutral">{current.type}</Badge>}
            {current.year && <Badge tone="neutral">{current.year}</Badge>}
            {current.status && (
              <Badge tone={current.status === 'Airing' ? 'success' : current.status === 'Upcoming' ? 'warning' : 'neutral'}>
                {current.status}
              </Badge>
            )}
          </div>
          {current.genres && current.genres.length > 0 && (
            <div className="hero-top10__genres">
              {current.genres.slice(0, 3).map(g => (
                <span key={g}>{g}</span>
              ))}
            </div>
          )}
          <p className="hero-top10__synopsis">{current.synopsis}</p>
          <div className="hero-top10__actions">
            <Button onClick={() => onSelect?.(current)}>
              <Play size={15} fill="currentColor" /> Watch Now
            </Button>
            <Button variant="glass" onClick={() => onAddToList?.(current)}>
              <Plus size={16} /> Add to List
            </Button>
          </div>
        </div>

        {/* Right: poster */}
        <div className="hero-top10__poster-wrap">
          <div className="hero-top10__poster">
            <img
              src={current.poster}
              alt={`${current.title} poster`}
              loading="eager"
            />
            <strong className="hero-top10__poster-rank">#{rank}</strong>
          </div>
        </div>
      </div>

      {/* Bottom strip: ranked thumbnails */}
      <div className="hero-top10__strip-area">
        <IconButton
          label="Previous"
          onClick={() => goTo(activeIndex - 1)}
        >
          <ChevronLeft />
        </IconButton>

        <div className="hero-top10__strip" ref={stripRef}>
          {anime.map((item, i) => (
            <button
              key={item.id}
              className={`hero-top10__thumb ${i === activeIndex ? 'hero-top10__thumb--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Show #${String(i + 1).padStart(2, '0')} ${item.title}`}
              aria-current={i === activeIndex ? 'true' : undefined}
            >
              <img src={item.poster} alt="" loading="lazy" />
              <span className="hero-top10__thumb-rank">
                {String(i + 1).padStart(2, '0')}
              </span>
            </button>
          ))}
        </div>

        <IconButton
          label={paused ? 'Resume autoplay' : 'Pause autoplay'}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play /> : <Pause />}
        </IconButton>

        <IconButton
          label="Next"
          onClick={() => goTo(activeIndex + 1)}
        >
          <ChevronRight />
        </IconButton>
      </div>
    </section>
  )
}
