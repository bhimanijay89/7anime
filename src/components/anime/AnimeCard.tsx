import { useState, useRef, useEffect } from 'react'
import { Bookmark, Play, Share2, Star } from 'lucide-react'
import type { Anime } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { Progress } from '../ui/Progress'
import { HoverPreviewCard } from './HoverPreviewCard'
import './anime.css'

export function AnimeCard({
  anime,
  variant = 'poster',
  rank,
  isSaved,
  onToggleSave,
  onSelect,
  onPlay,
}: {
  anime: Anime
  variant?: 'poster' | 'compact' | 'landscape' | 'continue' | 'ranked'
  rank?: number
  isSaved?: boolean
  onToggleSave?: (anime: Anime) => void
  onSelect?: (anime: Anime) => void
  onPlay?: (anime: Anime) => void
}) {
  const cardRef = useRef<HTMLElement>(null)
  const [showHover, setShowHover] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current)
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    if (closeAnimationRef.current) clearTimeout(closeAnimationRef.current)
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  const startClose = () => {
    setIsClosing(true)
    closeAnimationRef.current = setTimeout(() => {
      setShowHover(false)
      setIsClosing(false)
    }, 280)
  }

  const cancelClose = () => {
    if (closeAnimationRef.current) {
      clearTimeout(closeAnimationRef.current)
      closeAnimationRef.current = null
    }
    setIsClosing(false)
  }

  const handleMouseEnter = () => {
    // Only trigger hover on mouse-pointer devices (not touch screens)
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
      return
    }

    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }

    cancelClose()

    if (!showHover && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      enterTimeoutRef.current = setTimeout(() => {
        setAnchorRect(rect)
        setShowHover(true)
        setIsClosing(false)
      }, 350)
    }
  }

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current)
      enterTimeoutRef.current = null
    }

    leaveTimeoutRef.current = setTimeout(() => {
      startClose()
    }, 280)
  }

  const handlePortalMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    cancelClose()
  }

  const handlePortalMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      startClose()
    }, 220)
  }

  return (
    <>
      <article
        ref={cardRef}
        className={`anime-card anime-card--${variant}`}
        onClick={() => onSelect?.(anime)}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? 'button' : undefined}
        onKeyDown={onSelect ? e => e.key === 'Enter' && onSelect(anime) : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: onSelect ? 'pointer' : undefined }}
      >
        <div className="anime-card__art">
          <img
            src={anime.poster}
            alt={`${anime.title} poster`}
            loading="lazy"
            onError={e => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="anime-card__actions">
            <button
              aria-label={isSaved ? `Remove ${anime.title} from list` : `Save ${anime.title}`}
              title={isSaved ? 'In My List (Click to remove)' : 'Add to List'}
              style={{
                color: isSaved ? 'var(--color-accent)' : undefined,
                borderColor: isSaved ? 'rgba(85, 216, 255, 0.4)' : undefined,
              }}
              onClick={e => {
                e.stopPropagation()
                onToggleSave?.(anime)
              }}
            >
              <Bookmark
                size={16}
                fill={isSaved ? 'var(--color-accent)' : 'none'}
                color={isSaved ? 'var(--color-accent)' : 'currentColor'}
              />
            </button>
            <button
              aria-label={`Share ${anime.title}`}
              onClick={e => {
                e.stopPropagation()
              }}
            >
              <Share2 size={16} />
            </button>
          </div>
          {variant === 'ranked' && (
            <strong className="rank">
              {rank !== undefined ? String(rank).padStart(2, '0') : '01'}
            </strong>
          )}
          {variant === 'continue' && anime.progress !== undefined && (
            <>
              <div className="anime-card__episode-info">
                <Play size={12} fill="currentColor" />
                <span>{anime.episode} · {anime.progress}%</span>
              </div>
              <div className="anime-card__progress">
                <Progress value={anime.progress} />
              </div>
            </>
          )}
          {variant !== 'continue' && anime.progress !== undefined && (
            <div className="anime-card__progress">
              <Progress value={anime.progress} />
            </div>
          )}
        </div>
        <div className="anime-card__details">
          <h3>{anime.title}</h3>
          <div className="anime-card__meta">
            <span>{anime.episode}</span>
            {anime.rating && (
              <span>
                <Star size={12} fill="currentColor" /> {anime.rating}
              </span>
            )}
          </div>
          <div className="anime-card__badges">
            {anime.sub && <Badge tone="accent">SUB {anime.sub}</Badge>}
            {anime.dub && <Badge>DUB {anime.dub}</Badge>}
            <Badge tone={anime.status === 'Airing' ? 'success' : 'neutral'}>
              {anime.status}
            </Badge>
          </div>
        </div>
      </article>

      {showHover && anchorRect && (
        <HoverPreviewCard
          anime={anime}
          anchorRect={anchorRect}
          isSaved={isSaved}
          isClosing={isClosing}
          onToggleSave={onToggleSave}
          onPlay={onPlay || onSelect}
          onViewDetails={onSelect}
          onMouseEnter={handlePortalMouseEnter}
          onMouseLeave={handlePortalMouseLeave}
        />
      )}
    </>
  )
}
