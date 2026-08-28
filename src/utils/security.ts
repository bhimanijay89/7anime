/**
 * 7anime Production Security & Diagnostic Notice
 * Lightweight, non-destructive deterrent mechanism.
 */

let isInitialized = false

export function initProductionSecurityNotice(): void {
  if (isInitialized) return
  isInitialized = true

  // Only run notice in production or when explicit console exists
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    try {
      console.log(
        '%c7anime Security Notice%c\nAll security-sensitive operations, state mutations, and access controls are validated server-side.',
        'font-size: 16px; font-weight: bold; color: #55d8ff; background: #080a0f; padding: 4px 8px; border-radius: 4px;',
        'font-size: 12px; color: #aeb8ca;',
      )
    } catch {
      // Ignore console logging errors gracefully
    }
  }
}
