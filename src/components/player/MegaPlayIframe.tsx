import React, { forwardRef } from 'react'

export interface MegaPlayIframeProps {
  embedUrl: string
  title: string
  className?: string
  iframeRef?: React.Ref<HTMLIFrameElement>
  onLoad?: () => void
}

/**
 * MegaPlay Iframe Component
 *
 * Security Configuration:
 * Intentionally contains NO sandbox attribute.
 *
 * MegaPlay uses cross-origin postMessage communication for player telemetry,
 * episode progress reporting, and fullscreen controls. Applying a sandbox
 * without allow-same-origin breaks MegaPlay stream initialization.
 */
export const MegaPlayIframe = forwardRef<HTMLIFrameElement, MegaPlayIframeProps>(
  ({ embedUrl, title, className = 'cinema-player__iframe', onLoad }, ref) => {
    return (
      <iframe
        ref={ref}
        src={embedUrl}
        title={title}
        className={className}
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        onLoad={onLoad}
      />
    )
  }
)

MegaPlayIframe.displayName = 'MegaPlayIframe'
