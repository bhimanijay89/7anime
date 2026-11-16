import React, { forwardRef } from 'react'

export interface AnimeTVPlusIframeProps {
  embedUrl: string
  title: string
  className?: string
  iframeRef?: React.Ref<HTMLIFrameElement>
  onLoad?: () => void
}

/**
 * AnimeTVPlus Iframe Component
 *
 * Security Configuration:
 * Strictly isolated with sandbox="allow-scripts allow-forms allow-presentation".
 *
 * DO NOT ADD:
 * - allow-same-origin
 * - allow-popups
 * - allow-popups-to-escape-sandbox
 * - allow-top-navigation
 *
 * This configuration ensures 100% video playback while blocking malicious popups,
 * background tabs, and top-level redirects. Verified via Chrome Puppeteer testing.
 */
export const AnimeTVPlusIframe = forwardRef<HTMLIFrameElement, AnimeTVPlusIframeProps>(
  ({ embedUrl, title, className = 'cinema-player__iframe', onLoad }, ref) => {
    return (
      <iframe
        ref={ref}
        src={embedUrl}
        title={title}
        className={className}
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        sandbox="allow-scripts allow-forms allow-presentation"
        onLoad={onLoad}
      />
    )
  }
)

AnimeTVPlusIframe.displayName = 'AnimeTVPlusIframe'
