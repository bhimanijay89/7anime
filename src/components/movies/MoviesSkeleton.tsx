import React from 'react'
import { Skeleton, SkeletonText } from '../ui/Skeleton'

/**
 * Dedicated high-fidelity loading skeleton for the redesigned Movies page
 */
export function MoviesSkeleton() {
  return (
    <div className="movies-view movies-view--skeleton" aria-busy="true" aria-label="Loading anime movies">
      {/* A. Compact Intro Skeleton */}
      <div className="movies-intro glass-elevated">
        <div className="movies-intro__content" style={{ width: '100%', maxWidth: '38rem' }}>
          <Skeleton variant="badge" width="9.5rem" height="1.4rem" accent />
          <Skeleton variant="title" width="60%" height="2.2rem" />
          <Skeleton variant="text" width="85%" height="1rem" />
        </div>
        <div className="movies-intro__stat-box">
          <Skeleton variant="text" width="3.5rem" height="0.8rem" />
          <Skeleton variant="title" width="2.5rem" height="1.8rem" accent />
        </div>
      </div>

      {/* B. Cinematic Hero Skeleton */}
      <div className="movies-hero movies-spotlight--skeleton glass-elevated">
        <div className="movies-hero__content" style={{ width: '100%' }}>
          <div className="movies-hero__poster-col">
            <div
              className="movies-hero__poster-box skeleton-box"
              style={{ width: '12.5rem', aspectRatio: '2 / 3' }}
            />
          </div>
          <div className="movies-hero__details" style={{ width: '100%', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Skeleton variant="badge" width="7rem" height="1.4rem" accent />
              <Skeleton variant="badge" width="3.5rem" height="1.4rem" />
              <Skeleton variant="badge" width="4.5rem" height="1.4rem" />
            </div>
            <Skeleton variant="title" width="65%" height="2.4rem" />
            <Skeleton variant="text" width="35%" height="1rem" />
            <SkeletonText lines={3} widths={['full', 'long', 'medium']} />
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
              <Skeleton variant="button" width="9rem" height="2.4rem" accent />
              <Skeleton variant="button" width="8rem" height="2.4rem" />
            </div>
          </div>
        </div>
      </div>

      {/* D. Toolbar Skeleton */}
      <div className="movies-toolbar glass" style={{ height: '4.5rem', opacity: 0.7 }} />

      {/* E. Grid Skeleton (12 movie cards) */}
      <div className="movies-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="movie-card" style={{ width: '100%' }}>
            <div
              className="movie-card__poster-box skeleton-box"
              style={{ aspectRatio: '2 / 3', borderRadius: '10px' }}
            />
            <div className="movie-card__body" style={{ marginTop: '0.5rem', gap: '0.4rem' }}>
              <Skeleton variant="title" width="85%" height="1.1rem" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
