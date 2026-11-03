import type { CSSProperties, ReactNode } from 'react'
import { Sparkles, ArrowLeft } from 'lucide-react'
import './skeleton.css'

/* =========================================================
   BASE SKELETON PRIMITIVE
   ========================================================= */

export type SkeletonVariant =
  | 'rect'
  | 'text'
  | 'title'
  | 'badge'
  | 'circle'
  | 'button'

export interface SkeletonProps {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  accent?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  borderRadius,
  accent = false,
  className = '',
  style,
  children,
}: SkeletonProps) {
  const variantClass = variant !== 'rect' ? `skeleton-box--${variant}` : ''
  const accentClass = accent ? 'skeleton-box--accent' : ''

  const inlineStyles: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(borderRadius !== undefined ? { borderRadius } : {}),
    ...style,
  }

  return (
    <div
      className={`skeleton-box ${variantClass} ${accentClass} ${className}`.trim()}
      style={inlineStyles}
      aria-hidden="true"
    >
      {children}
    </div>
  )
}

/* =========================================================
   SKELETON TEXT GROUP
   ========================================================= */

export interface SkeletonTextProps {
  lines?: number
  className?: string
  widths?: Array<'short' | 'medium' | 'long' | 'full'>
}

export function SkeletonText({
  lines = 3,
  className = '',
  widths,
}: SkeletonTextProps) {
  const defaultWidths: Array<'short' | 'medium' | 'long' | 'full'> = [
    'full',
    'long',
    'medium',
    'short',
  ]

  return (
    <div className={`skeleton-text-group ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => {
        const widthType =
          widths && widths[i]
            ? widths[i]
            : defaultWidths[i % defaultWidths.length]
        return (
          <Skeleton
            key={i}
            variant="text"
            className={`skeleton-line skeleton-line--${widthType}`}
          />
        )
      })}
    </div>
  )
}

/* =========================================================
   SKELETON CARD (Poster or Continue)
   ========================================================= */

export interface SkeletonCardProps {
  variant?: 'poster' | 'continue'
  className?: string
}

export function SkeletonCard({
  variant = 'poster',
  className = '',
}: SkeletonCardProps) {
  const isContinue = variant === 'continue'

  return (
    <div
      className={`skeleton-card ${isContinue ? 'skeleton-card--continue' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <div className="skeleton-card__poster skeleton-box">
        {isContinue && <div className="skeleton-card__progress-bar skeleton-box--accent" />}
      </div>
      <div className="skeleton-card__details">
        <Skeleton variant="text" width={isContinue ? '75%' : '85%'} height="1rem" />
        <Skeleton variant="text" width={isContinue ? '45%' : '60%'} height="0.75rem" />
        {!isContinue && (
          <div className="skeleton-card__badges">
            <Skeleton variant="badge" width="3.2rem" height="1.1rem" />
            <Skeleton variant="badge" width="2.4rem" height="1.1rem" />
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   SKELETON HERO (Top 10 Cinematic Carousel)
   ========================================================= */

export function SkeletonHero() {
  return (
    <section className="skeleton-hero" aria-label="Loading featured spotlight">
      <div className="skeleton-hero__backdrop" />

      <div className="skeleton-hero__main">
        <div className="skeleton-hero__content">
          <div className="skeleton-hero__eyebrow">
            <Skeleton variant="badge" width="6.5rem" height="1.4rem" accent />
            <Skeleton variant="badge" width="7.5rem" height="1.4rem" />
          </div>

          <div className="skeleton-hero__title-wrap">
            <Skeleton variant="title" width="82%" height="2.8rem" />
            <Skeleton variant="title" width="55%" height="2.4rem" />
          </div>

          <div className="skeleton-hero__specs">
            <Skeleton variant="badge" width="3.8rem" height="1.4rem" />
            <Skeleton variant="badge" width="3.2rem" height="1.4rem" />
            <Skeleton variant="badge" width="3.4rem" height="1.4rem" />
            <Skeleton variant="badge" width="4.5rem" height="1.4rem" />
          </div>

          <div className="skeleton-hero__synopsis">
            <SkeletonText lines={3} widths={['full', 'long', 'medium']} />
          </div>

          <div className="skeleton-hero__actions">
            <Skeleton variant="button" width="9rem" height="2.75rem" accent />
            <Skeleton variant="button" width="8rem" height="2.75rem" />
          </div>
        </div>

        <div className="skeleton-hero__poster-wrap">
          <div className="skeleton-hero__poster skeleton-box" />
        </div>
      </div>

      <div className="skeleton-hero__thumbnails">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-hero__thumb-pill skeleton-box" />
        ))}
      </div>
    </section>
  )
}

/* =========================================================
   SKELETON QUICK ACTIONS BAR
   ========================================================= */

export function SkeletonQuickActions() {
  return (
    <section className="skeleton-quick" aria-hidden="true">
      <div className="skeleton-quick__left">
        <Sparkles size={16} color="var(--color-accent)" opacity={0.6} />
        <Skeleton variant="text" width="10rem" height="1rem" />
      </div>

      <div className="skeleton-quick__right">
        <Skeleton variant="button" width="8.5rem" height="2.2rem" accent />
        <Skeleton variant="button" width="7rem" height="2.2rem" />
      </div>
    </section>
  )
}

/* =========================================================
   SKELETON CONTENT RAIL
   ========================================================= */

export interface SkeletonRailProps {
  titleWidth?: string
  subtitleWidth?: string
  count?: number
  variant?: 'poster' | 'continue'
}

export function SkeletonRail({
  titleWidth = '12rem',
  subtitleWidth = '18rem',
  count = 7,
  variant = 'poster',
}: SkeletonRailProps) {
  return (
    <div className="skeleton-rail" aria-hidden="true">
      <div className="skeleton-rail__header">
        <div className="skeleton-rail__title-block">
          <Skeleton variant="title" width={titleWidth} height="1.4rem" />
          {subtitleWidth && (
            <Skeleton variant="text" width={subtitleWidth} height="0.8rem" />
          )}
        </div>
        <Skeleton variant="text" width="4.5rem" height="0.85rem" />
      </div>

      <div className="skeleton-rail__items">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} variant={variant} />
        ))}
      </div>
    </div>
  )
}

/* =========================================================
   SKELETON DISCOVERY CATALOG
   ========================================================= */

export function SkeletonDiscoveryCatalog() {
  return (
    <section className="skeleton-discovery" aria-hidden="true">
      <div className="skeleton-rail__title-block">
        <Skeleton variant="text" width="8rem" height="0.75rem" accent />
        <Skeleton variant="title" width="16rem" height="2rem" />
        <Skeleton variant="text" width="22rem" height="0.85rem" />
      </div>

      <div className="skeleton-discovery__tools">
        <Skeleton variant="rect" width="14rem" height="2.2rem" borderRadius="var(--radius-md)" />
        <Skeleton variant="rect" width="8rem" height="2.2rem" borderRadius="var(--radius-md)" />
      </div>

      <div className="skeleton-discovery__genres">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-discovery__genre-pill skeleton-box" />
        ))}
      </div>

      <div className="skeleton-discovery__grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} variant="poster" />
        ))}
      </div>
    </section>
  )
}

/* =========================================================
   HOME PAGE FULL SKELETON
   ========================================================= */

export function HomeSkeleton() {
  return (
    <div className="home-skeleton-wrapper" aria-busy="true" aria-label="Loading 7anime feed">
      {/* Top 10 Hero Spotlight Carousel Skeleton */}
      <SkeletonHero />

      {/* Quick discovery bar */}
      <SkeletonQuickActions />

      {/* Continue Watching Rail Skeleton */}
      <SkeletonRail
        titleWidth="10.5rem"
        subtitleWidth=""
        count={5}
        variant="continue"
      />

      {/* Section Head Skeleton */}
      <div className="skeleton-section-head">
        <div className="skeleton-section-head__left">
          <Skeleton variant="text" width="7rem" height="0.75rem" accent />
          <Skeleton variant="title" width="14rem" height="2rem" />
        </div>
        <Skeleton variant="text" width="12rem" height="0.85rem" />
      </div>

      {/* Trending Rail Skeleton */}
      <SkeletonRail
        titleWidth="13.5rem"
        subtitleWidth="16rem"
        count={7}
        variant="poster"
      />

      {/* Top Rated Rail Skeleton */}
      <SkeletonRail
        titleWidth="14rem"
        subtitleWidth="15rem"
        count={7}
        variant="poster"
      />

      {/* Discovery Catalog Grid Skeleton */}
      <SkeletonDiscoveryCatalog />
    </div>
  )
}

/* =========================================================
   ANIME DETAIL FULL SKELETON
   ========================================================= */

export interface DetailSkeletonProps {
  onBack?: () => void
}

export function DetailSkeleton({ onBack }: DetailSkeletonProps) {
  return (
    <div className="skeleton-detail" aria-busy="true" aria-label="Loading anime details">
      <div className="skeleton-detail__nav">
        {onBack ? (
          <button
            type="button"
            className="detail-hero__back"
            onClick={onBack}
            aria-label="Go back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--color-glass)',
              border: '1px solid var(--color-glass-border)',
              borderRadius: '999px',
              padding: '0.4rem 0.9rem',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        ) : (
          <Skeleton variant="button" width="5.5rem" height="2rem" borderRadius="999px" />
        )}
      </div>

      <div className="skeleton-detail__hero">
        <div className="skeleton-detail__backdrop" />

        <div className="skeleton-detail__hero-content">
          <div className="skeleton-detail__poster skeleton-box" />

          <div className="skeleton-detail__info">
            <div className="skeleton-detail__tags">
              <Skeleton variant="badge" width="4.5rem" height="1.3rem" accent />
              <Skeleton variant="badge" width="3.8rem" height="1.3rem" />
              <Skeleton variant="badge" width="3.2rem" height="1.3rem" />
            </div>

            <Skeleton variant="title" width="85%" height="2.6rem" />
            <Skeleton variant="text" width="45%" height="1rem" />

            <div className="skeleton-detail__specs">
              <Skeleton variant="badge" width="4rem" height="1.4rem" />
              <Skeleton variant="badge" width="3.5rem" height="1.4rem" />
              <Skeleton variant="badge" width="5.5rem" height="1.4rem" />
              <Skeleton variant="badge" width="6.5rem" height="1.4rem" />
            </div>

            <div className="skeleton-detail__synopsis">
              <SkeletonText lines={4} widths={['full', 'long', 'full', 'medium']} />
            </div>

            <div className="skeleton-detail__actions">
              <Skeleton variant="button" width="9.5rem" height="2.75rem" accent />
              <Skeleton variant="button" width="8rem" height="2.75rem" />
              <Skeleton variant="circle" width="2.75rem" height="2.75rem" />
            </div>
          </div>
        </div>
      </div>

      {/* Episode List Skeleton */}
      <div className="skeleton-detail__episodes">
        <div className="skeleton-detail__episode-header">
          <Skeleton variant="title" width="10rem" height="1.6rem" />
          <Skeleton variant="rect" width="12rem" height="2.2rem" borderRadius="var(--radius-md)" />
        </div>

        <div className="skeleton-detail__episode-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton-detail__episode-card skeleton-box" />
          ))}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   SEARCH RESULTS SKELETON
   ========================================================= */

export function SearchSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-search-list" aria-busy="true" aria-label="Searching anime catalog">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-search-item">
          <div className="skeleton-search-thumb skeleton-box" />
          <div className="skeleton-search-content">
            <Skeleton variant="text" width="75%" height="1.1rem" />
            <Skeleton variant="text" width="40%" height="0.8rem" />
            <div className="skeleton-search-badges">
              <Skeleton variant="badge" width="3rem" height="1rem" />
              <Skeleton variant="badge" width="3.5rem" height="1rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
