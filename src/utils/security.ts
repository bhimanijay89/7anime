/**
 * 7anime Production Security & DevTools Deterrent
 * Lightweight, non-destructive detection and warning overlay.
 *
 * NOTE: Common DevTools-open conditions are detected and a lightweight deterrent
 * is shown, but DevTools cannot be completely prevented in a user-controlled browser.
 */

let cleanupFn: (() => void) | null = null

export function initProductionSecurityNotice(): () => void {
  // Return existing cleanup if already initialized
  if (cleanupFn) return cleanupFn

  // Only run in production environments
  if (!import.meta.env.PROD || typeof window === 'undefined') {
    cleanupFn = () => {}
    return cleanupFn
  }

  let bannerElement: HTMLDivElement | null = null
  let isBannerVisible = false

  const isTouchDevice =
    'ontouchstart' in window ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)

  function createBanner(): HTMLDivElement {
    const banner = document.createElement('div')
    banner.id = '7anime-devtools-banner'
    banner.setAttribute('role', 'status')
    banner.setAttribute('aria-live', 'polite')
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      max-width: 380px;
      padding: 14px 18px;
      background-color: rgba(14, 20, 32, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(85, 216, 255, 0.3);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(85, 216, 255, 0.15);
      color: #f5f8ff;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 0.82rem;
      line-height: 1.45;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 300ms ease, transform 300ms ease;
      pointer-events: auto;
    `

    const textContent = document.createElement('div')
    textContent.style.flex = '1'
    textContent.innerHTML = `
      <div style="font-weight: 700; color: #55d8ff; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 1rem;">⚡</span> Developer Tools Detected
      </div>
      <div style="color: #aeb8ca; font-size: 0.78rem;">
        Security-sensitive operations and permissions are enforced server-side.
      </div>
    `

    const closeBtn = document.createElement('button')
    closeBtn.setAttribute('aria-label', 'Dismiss notice')
    closeBtn.innerHTML = '✕'
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #748096;
      font-size: 14px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 150ms ease;
      margin-top: -2px;
    `
    closeBtn.onmouseenter = () => (closeBtn.style.color = '#f5f8ff')
    closeBtn.onmouseleave = () => (closeBtn.style.color = '#748096')
    closeBtn.onclick = () => hideBanner()

    banner.appendChild(textContent)
    banner.appendChild(closeBtn)
    return banner
  }

  function showBanner() {
    if (isBannerVisible) return
    if (!bannerElement) {
      bannerElement = createBanner()
      document.body.appendChild(bannerElement)
    }
    isBannerVisible = true
    requestAnimationFrame(() => {
      if (bannerElement) {
        bannerElement.style.opacity = '1'
        bannerElement.style.transform = 'translateY(0)'
      }
    })
  }

  function hideBanner() {
    if (!isBannerVisible || !bannerElement) return
    isBannerVisible = false
    bannerElement.style.opacity = '0'
    bannerElement.style.transform = 'translateY(10px)'
    setTimeout(() => {
      if (bannerElement && bannerElement.parentNode) {
        bannerElement.parentNode.removeChild(bannerElement)
        bannerElement = null
      }
    }, 300)
  }

  function checkDevTools() {
    // Skip checking on touch devices to avoid viewport false positives
    if (isTouchDevice) return

    const widthDelta = window.outerWidth - window.innerWidth
    const heightDelta = window.outerHeight - window.innerHeight

    // DevTools docked on side or bottom threshold check (typical DevTools > 180px)
    const isDocked = widthDelta > 180 || heightDelta > 180

    if (isDocked) {
      showBanner()
    }
  }

  // Low frequency polling check (every 1500ms)
  const intervalId = setInterval(checkDevTools, 1500)

  // Console notice log
  try {
    console.log(
      '%c7anime Security%c\nDevTools detection active. Permissions and state mutations are validated server-side.',
      'font-size: 14px; font-weight: bold; color: #55d8ff; background: #0e1420; padding: 4px 8px; border-radius: 4px;',
      'font-size: 12px; color: #aeb8ca;',
    )
  } catch {
    // Ignore logging failures
  }

  cleanupFn = () => {
    clearInterval(intervalId)
    hideBanner()
    cleanupFn = null
  }

  return cleanupFn
}
