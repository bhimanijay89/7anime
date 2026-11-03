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
 * - Graceful fallback to styled anime title text on missing logo or image load error
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

  const logoUrl = logo?.url

  // Reset state when the logo URL changes (e.g. carousel slide change)
  useEffect(() => {
    setImageError(false)
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true)
      return
    }
    setImageLoaded(false)

    if (logoUrl) {
      const timeout = window.setTimeout(() => {
        if (!imgRef.current?.complete || imgRef.current.naturalWidth === 0) {
          setImageError(true)
        }
      }, 2000)
      return () => window.clearTimeout(timeout)
    }
  }, [logoUrl])

  const shouldRenderImage = Boolean(logoUrl && !imageError)
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

  if (!shouldRenderImage) {
    return textTitleElement
  }

  return (
    <div className={`anime-logo__container ${variantClass} ${className}`.trim()}>
      {!imageLoaded && textTitleElement}
      <img
        ref={imgRef}
        src={logoUrl}
        alt={title}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`anime-logo__img ${imageLoaded ? 'anime-logo__img--loaded' : 'anime-logo__img--loading'}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{
          display: imageLoaded ? 'block' : 'none',
          ...(logo?.aspectRatio ? { aspectRatio: `${logo.aspectRatio}` } : {}),
        }}
      />
      <span className="sr-only">{title}</span>
    </div>
  )
}
