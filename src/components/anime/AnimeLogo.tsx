import React, { useEffect, useState } from 'react'
import type { AnimeLogo as AnimeLogoType } from '../../types/domain'
import './animeLogo.css'

export interface AnimeLogoProps {
  /** The resolved TMDB anime logo object */
  logo?: AnimeLogoType | null
  /** Anime title used as fallback and image alt text */
  title: string
  /** Size variant tailored for each presentation context */
  sizeVariant?: 'hero' | 'detail' | 'upcoming'
  /** Optional custom class name */
  className?: string
  /** Whether the image should load eagerly */
  priority?: boolean
}

/**
 * Universal Anime Logo Component
 *
 * Renders the official TMDB title logo (transparent PNG) with:
 * - Proportional containment (`object-fit: contain`)
 * - Responsive sizing per location (Hero, Detail, Upcoming)
 * - Pure skeleton while loading — never shows plain title simply because image is loading
 * - Graceful fallback to styled anime title text ONLY when logo is unavailable or fails to load
 * - Crossfade transitions between slides
 * - Accessible image alt and heading structure
 */
export function AnimeLogo({
  logo,
  title,
  sizeVariant = 'hero',
  className = '',
  priority = false,
}: AnimeLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  // Normalize logo URL supporting both logo.url and logo.logoUrl
  const logoUrl =
    logo?.url ||
    (logo as unknown as { logoUrl?: string })?.logoUrl ||
    ''

  // Reset state when the logo URL changes (e.g. carousel slide change)
  useEffect(() => {
    setImageError(false)
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true)
      return
    }
    setImageLoaded(false)
  }, [logoUrl])

  const variantClass = `anime-logo--${sizeVariant}`
  const HeadingTag = sizeVariant === 'hero' || sizeVariant === 'detail' ? 'h1' : 'h2'
  const len = title.length
  const longClass =
    len > 60
      ? 'anime-logo__text--xl'
      : len > 35
        ? 'anime-logo__text--lg'
        : ''

  const textTitleElement = (
    <HeadingTag className={`anime-logo__text ${variantClass} ${longClass} ${className}`.trim()}>
      {title}
    </HeadingTag>
  )

  // Show plain title ONLY when logo is genuinely unavailable or fails to load
  if (!logoUrl || imageError) {
    return textTitleElement
  }

  return (
    <div className={`anime-logo__container ${variantClass} ${className}`.trim()}>
      {!imageLoaded && (
        <div
          className="anime-logo__skeleton"
          style={{
            aspectRatio: logo?.aspectRatio ? `${logo.aspectRatio}` : '3.2 / 1',
          }}
          aria-hidden="true"
        />
      )}
      <img
        ref={imgRef}
        src={logoUrl}
        alt={title}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`anime-logo__img ${imageLoaded ? 'anime-logo__img--loaded' : 'anime-logo__img--loading'}`}
        onLoad={() => {
          setImageLoaded(true)
          setImageError(false)
        }}
        onError={() => {
          setImageError(true)
        }}
        style={{
          opacity: imageLoaded ? 1 : 0,
          position: imageLoaded ? 'static' : 'absolute',
          ...(logo?.aspectRatio ? { aspectRatio: `${logo.aspectRatio}` } : {}),
        }}
      />
      <span className="sr-only">{title}</span>
    </div>
  )
}
