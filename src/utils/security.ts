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

function resetSecurityStateForMobile(): void {
  if (debounceTimeoutId) {
    clearTimeout(debounceTimeoutId)
    debounceTimeoutId = null
  }
  if (currentDetectedState) {
    currentDetectedState = false
    listeners.forEach(fn => fn(false))
  }
}

export function isDevToolsActive(): boolean {
  if (DISABLE_DEVTOOLS_DETECTION_FOR_TESTING) return false
  if (isRealMobileDevice()) {
    resetSecurityStateForMobile()
    return false
  }
  return currentDetectedState
}

export function onDevToolsChange(listener: DevToolsListener): () => void {
  listeners.add(listener)
  if (isRealMobileDevice()) {
    resetSecurityStateForMobile()
    listener(false)
  } else {
    listener(DISABLE_DEVTOOLS_DETECTION_FOR_TESTING ? false : currentDetectedState)
  }
  return () => {
    listeners.delete(listener)
  }
}

function isRealMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  // Desktop OS platforms (Windows, macOS, Linux desktop) must NEVER be classified as real mobile hardware,
  // even when Chrome DevTools Responsive Device Mode or device emulation is enabled.
  const platform = navigator.platform || ''
  const uadPlatform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || ''

  const isDesktopOS =
    /Win32|Win64|Windows|WinCE/i.test(platform) ||
    /Windows/i.test(uadPlatform) ||
    /macOS/i.test(uadPlatform) ||
    (uadPlatform === 'Linux' && !/Android/i.test(navigator.userAgent)) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints === 0)

  if (isDesktopOS) {
    return false
  }

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

  // On Desktop Chrome (including DevTools Responsive Device Mode), outerWidth/outerHeight reflects the desktop window size.
  // On real mobile devices (phones/tablets), outerWidth is either 0 (iOS) or matches innerWidth (Android).
  const outerW = window.outerWidth
  const outerH = window.outerHeight
  const innerW = window.innerWidth
  const innerH = window.innerHeight

  const isDesktopWindowDelta =
    (outerW > 0 && Math.abs(outerW - innerW) > 160) ||
    (outerH > 0 && Math.abs(outerH - innerH) > 160)

  if (isDesktopWindowDelta) {
    return false
  }

  const screenW = window.screen.width
  const screenH = window.screen.height

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

  if (isRealMobileDevice()) {
    resetSecurityStateForMobile()
  }

  if (cleanupFn) return cleanupFn

  if (typeof window === 'undefined') {
    cleanupFn = () => { }
    return cleanupFn
  }

  function notifyListeners(nextState: boolean) {
    if (isRealMobileDevice()) {
      resetSecurityStateForMobile()
      return
    }

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
    if (isRealMobileDevice()) {
      resetSecurityStateForMobile()
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
