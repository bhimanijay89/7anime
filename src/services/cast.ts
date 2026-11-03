/**
 * 7Anime Android TV & Cast Service
 * Provides capability detection and guidance for casting 7Anime to Android TV / Chromecast.
 */

export function isPresentationSupported(): boolean {
  return typeof window !== 'undefined' && 'PresentationRequest' in window
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}
