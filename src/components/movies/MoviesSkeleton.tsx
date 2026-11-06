import React from 'react'
import { Skeleton, SkeletonText } from '../ui/Skeleton'

/**
 * Dedicated high-fidelity loading skeleton for the Movies page
 */
export function MoviesSkeleton() {
  return (
    <div className="movies-view movies-view--skeleton" aria-busy="true" aria-label="Loading anime movies">
      {/* Header Banner Skeleton */}
      <div className="movies-view__header glass">
        <div className="movies-view__header-info" style={{ width: '100%', maxWidth: '42rem' }}>
          <Skeleton variant="badge" width="9.5rem" height="1.4rem" accent />
          <Skeleton variant="title" width="65%" height="2.8rem" />
          <Skeleton variant="text" width="85%" height="1.1rem" />
        </div>
        <div className="movies-view__header-stat">
          <Skeleton variant="title" width="4rem" height="3rem" accent />
        </div>
      </div>

      {/* Spotlight Feature Skeleton */}
      <div className="movies-spotlight movies-spotlight--skeleton glass">
        <div className="movies-spotlight__content" style={{ width: '100%' }}>
          <div
            className="movies-spotlight__poster skeleton-box"
            style={{ width: '11rem', aspectRatio: '2 / 3' }}
          />
          <div className="movies-spotlight__details" style={{ width: '100%', gap: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Skeleton variant="badge" width="6.5rem" height="1.4rem" accent />
              <Skeleton variant="badge" width="3.5rem" height="1.4rem" />
              <Skeleton variant="badge" width="4rem" height="1.4rem" />
            </div>
            <Skeleton variant="title" width="70%" height="2.2rem" />
            <Skeleton variant="text" width="40%" height="1rem" />
            <SkeletonText lines={3} widths={['full', 'long', 'medium']} />
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.6rem' }}>
              <Skeleton variant="button" width="9rem" height="2.5rem" accent />
              <Skeleton variant="button" width="8rem" height="2.5rem" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="movies-toolbar glass" style={{ height: '5rem', opacity: 0.7 }} />

      {/* Grid Skeleton (12 cards) */}
      <div className="movies-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="anime-card" style={{ width: '100%' }}>
            <div
              className="anime-card__art skeleton-box"
              style={{ aspectRatio: '2 / 3', borderRadius: 'var(--radius-md)' }}
            />
            <div className="anime-card__details" style={{ marginTop: '0.65rem' }}>
              <Skeleton variant="title" width="85%" height="1rem" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                <Skeleton variant="text" width="30%" height="0.8rem" />
                <Skeleton variant="text" width="25%" height="0.8rem" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

