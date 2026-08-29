/**
 * 7anime Production Security & DevTools Deterrent
 * Lightweight, non-destructive detection and warning overlay.
 *
 * NOTE: Common DevTools-open conditions are detected and a lightweight deterrent
 * is shown, but DevTools cannot be completely prevented in a user-controlled browser.
 */

type DevToolsListener = (isDetected: boolean) => void

let cleanupFn: (() => void) | null = null
let currentDetectedState = false
let debounceTimeoutId: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<DevToolsListener>()

/**
 * TEMPORARY DEV OVERRIDE FLAG
 * Set to true to temporarily disable DevTools decoy activation during testing.
 * Set to false to restore production security enforcement.
 */
const DISABLE_DEVTOOLS_DETECTION_FOR_TESTING = false

export function isDevToolsActive(): boolean {
  if (DISABLE_DEVTOOLS_DETECTION_FOR_TESTING) return false
  return currentDetectedState
}

export function onDevToolsChange(listener: DevToolsListener): () => void {
  listeners.add(listener)
  listener(DISABLE_DEVTOOLS_DETECTION_FOR_TESTING ? false : currentDetectedState)
  return () => {
    listeners.delete(listener)
  }
}

function isRealMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const hasTouch =
    'ontouchstart' in window ||
    (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 0)

  const isMobileUA =
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) ||
    Boolean(
      (navigator as unknown as { userAgentData?: { mobile?: boolean } })
        .userAgentData?.mobile,
    )

  if (!hasTouch || !isMobileUA) return false

  // Desktop Chrome Responsive Device Mode emulates touch & mobile UA, but screen width/height is desktop display monitor.
  // On real mobile devices (phones/tablets), innerWidth matches either physical screen width (portrait) or screen height (landscape).
  const screenW = window.screen.width
  const screenH = window.screen.height
  const innerW = window.innerWidth

  const matchesPortrait = Math.abs(screenW - innerW) < 60
  const matchesLandscape = Math.abs(screenH - innerW) < 60
  const isMobileScreenSize = Math.min(screenW, screenH) <= 1024

  return (matchesPortrait || matchesLandscape) && isMobileScreenSize
}

export function initProductionSecurityNotice(): () => void {
  if (DISABLE_DEVTOOLS_DETECTION_FOR_TESTING) {
    cleanupFn = () => { }
    return cleanupFn
  }

  if (cleanupFn) return cleanupFn

  if (typeof window === 'undefined') {
    cleanupFn = () => { }
    return cleanupFn
  }

  function notifyListeners(nextState: boolean) {
    if (nextState === currentDetectedState) return

    if (nextState) {
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId)
        debounceTimeoutId = null
      }
      currentDetectedState = true
      listeners.forEach(fn => fn(true))
    } else {
      if (!debounceTimeoutId) {
        debounceTimeoutId = setTimeout(() => {
          currentDetectedState = false
          debounceTimeoutId = null
          listeners.forEach(fn => fn(false))
        }, 1000)
      }
    }
  }

  function checkDevTools() {
    const isMobile = isRealMobileDevice()

    if (isMobile) {
      notifyListeners(false)
      return
    }

    const widthDelta = Math.abs(window.outerWidth - window.innerWidth)
    const heightDelta = Math.abs(window.outerHeight - window.innerHeight)

    const isDocked = widthDelta > 160 || heightDelta > 160

    let isDebuggerActive = false
    try {
      const startTime = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      isDebuggerActive = (performance.now() - startTime) > 100
    } catch {
      // Ignore
    }

    const detected = isDocked || isDebuggerActive
    notifyListeners(detected)
  }

  const intervalId = setInterval(checkDevTools, 1200)

  checkDevTools()

  cleanupFn = () => {
    clearInterval(intervalId)
    if (debounceTimeoutId) clearTimeout(debounceTimeoutId)
    cleanupFn = null
    notifyListeners(false)
  }

  return cleanupFn
}
