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

export function isDevToolsActive(): boolean {
  return currentDetectedState
}

export function onDevToolsChange(listener: DevToolsListener): () => void {
  listeners.add(listener)
  listener(currentDetectedState)
  return () => {
    listeners.delete(listener)
  }
}

export function initProductionSecurityNotice(): () => void {
  if (cleanupFn) return cleanupFn

  if (typeof window === 'undefined') {
    cleanupFn = () => {}
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

    if (!import.meta.env.PROD) {
      console.log(
        `[7anime security] devToolsDetected: ${detected}`
      )
    }

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
