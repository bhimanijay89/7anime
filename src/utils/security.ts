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

/**
 * STABLE LIFETIME ENVIRONMENT CLASSIFICATION
 * Evaluated ONCE per page lifecycle using stable OS and hardware signatures.
 * Never uses innerWidth/innerHeight, outerWidth/outerHeight, or screen size math,
 * preventing mobile address-bar shifts, keyboard events, or orientation changes
 * from triggering state oscillation or false positives.
 */
function computeIsRealMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const platform = navigator.platform || ''
  const uadPlatform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || ''
  const ua = navigator.userAgent || ''

  // Desktop OS platforms (Windows, macOS desktop, Linux desktop) must NEVER be classified as real mobile hardware,
  // even when Chrome DevTools Responsive Device Mode (RDM) or mobile UA emulation is enabled.
  const isWindowsDesktop = /Win32|Win64|Windows|WinCE/i.test(platform) || /Windows/i.test(uadPlatform)
  const isMacDesktop = /macOS/i.test(uadPlatform) || (platform === 'MacIntel' && navigator.maxTouchPoints === 0)
  const isLinuxDesktop = uadPlatform === 'Linux' && !/Android/i.test(ua)

  if (isWindowsDesktop || isMacDesktop || isLinuxDesktop) {
    return false
  }

  // Check for physical mobile OS / hardware signatures.
  const isAndroid = /Android/i.test(ua) || uadPlatform === 'Android' || /Linux arm|Linux aarch/i.test(platform)
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || /iPhone|iPad|iPod/i.test(platform)
  const isIPadOSDesktopMode = platform === 'MacIntel' && navigator.maxTouchPoints > 0 && !/Macintosh/i.test(uadPlatform)

  const hasTouch =
    'ontouchstart' in window ||
    (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 0)

  if (!hasTouch) return false

  return isAndroid || isIOS || isIPadOSDesktopMode
}

const IS_REAL_MOBILE = computeIsRealMobileDevice()

console.log(`[SECURITY] environment=${IS_REAL_MOBILE ? 'mobile' : 'desktop'}`)
console.log(`[SECURITY] isRealMobileDevice=${IS_REAL_MOBILE}`)

export function isRealMobileDevice(): boolean {
  return IS_REAL_MOBILE
}

export function isDevToolsActive(): boolean {
  if (IS_REAL_MOBILE) return false
  if (DISABLE_DEVTOOLS_DETECTION_FOR_TESTING) return false
  return currentDetectedState
}

export function onDevToolsChange(listener: DevToolsListener): () => void {
  listeners.add(listener)
  if (IS_REAL_MOBILE) {
    listener(false)
  } else {
    listener(DISABLE_DEVTOOLS_DETECTION_FOR_TESTING ? false : currentDetectedState)
  }
  return () => {
    listeners.delete(listener)
  }
}

export function initProductionSecurityNotice(): () => void {
  if (IS_REAL_MOBILE || DISABLE_DEVTOOLS_DETECTION_FOR_TESTING) {
    cleanupFn = () => { }
    return cleanupFn
  }

  if (cleanupFn) return cleanupFn

  if (typeof window === 'undefined') {
    cleanupFn = () => { }
    return cleanupFn
  }

  function notifyListeners(nextState: boolean) {
    if (IS_REAL_MOBILE) return

    if (nextState === currentDetectedState) return

    if (nextState) {
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId)
        debounceTimeoutId = null
      }
      console.log(`[SECURITY] state changed: ${currentDetectedState} -> true`)
      currentDetectedState = true
      listeners.forEach(fn => fn(true))
    } else {
      if (!debounceTimeoutId) {
        debounceTimeoutId = setTimeout(() => {
          console.log(`[SECURITY] state changed: ${currentDetectedState} -> false`)
          currentDetectedState = false
          debounceTimeoutId = null
          listeners.forEach(fn => fn(false))
        }, 1000)
      }
    }
  }

  function checkDevTools() {
    if (IS_REAL_MOBILE) return

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
    console.log(`[SECURITY] checkDevTools=executed isDocked=${isDocked} isDebuggerActive=${isDebuggerActive} currentDetectedState=${currentDetectedState}`)
    notifyListeners(detected)
  }

  const intervalId = setInterval(checkDevTools, 1200)
  window.addEventListener('resize', checkDevTools)

  checkDevTools()

  cleanupFn = () => {
    clearInterval(intervalId)
    window.removeEventListener('resize', checkDevTools)
    if (debounceTimeoutId) clearTimeout(debounceTimeoutId)
    cleanupFn = null
    notifyListeners(false)
  }

  return cleanupFn
}
