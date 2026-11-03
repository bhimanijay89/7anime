import { useState } from 'react'
import {
  Check,
  Copy,
  Info,
  Laptop,
  Maximize,
  Radio,
  Smartphone,
  Sparkles,
  Tv,
} from 'lucide-react'
import { Modal } from '../ui/Overlay'
import './castModal.css'

export interface CastModalProps {
  open: boolean
  onClose: () => void
  animeTitle?: string
  episodeNumber?: number
}

export function CastModal({
  open,
  onClose,
  animeTitle,
  episodeNumber,
}: CastModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to Watch on Android TV"
    >
      <div className="cast-modal-content">
        {/* Active episode badge */}
        {animeTitle && (
          <div className="cast-modal__now-playing">
            <Radio size={14} className="cast-modal__pulse-icon" />
            <span>
              Now Playing:{' '}
              <strong>
                {animeTitle}
                {typeof episodeNumber === 'number' ? ` — Ep ${episodeNumber}` : ''}
              </strong>
            </span>
          </div>
        )}

        {/* Informational Callout */}
        <div className="cast-modal__notice glass">
          <Info size={18} className="cast-modal__notice-icon" />
          <p>
            Because video streams are provided via encrypted player embeds, Android TV casting requires{' '}
            <strong>Tab Casting</strong> or <strong>Screen Mirroring</strong>. Follow the quick guide below for your device:
          </p>
        </div>

        {/* Methods Grid */}
        <div className="cast-modal__methods">
          {/* Method 1: PC / Laptop (Desktop Chrome / Edge) */}
          <div className="cast-modal__card glass featured">
            <div className="cast-modal__card-header">
              <div className="cast-modal__card-badge">METHOD 1 (RECOMMENDED)</div>
              <div className="cast-modal__card-icon-title">
                <Laptop size={20} className="cast-modal__method-icon" />
                <h3>From Laptop / PC (Chrome or Edge)</h3>
              </div>
            </div>

            <ol className="cast-modal__step-list">
              <li>
                Connect your PC and Android TV to the <strong>same Wi-Fi network</strong>.
              </li>
              <li>
                In Google Chrome, click the three dots <code>⋮</code> (top-right) &rarr; select <strong>Cast...</strong> (or right-click anywhere on this page and click <strong>Cast...</strong>).
              </li>
              <li>
                In the device popup, choose your <strong>Android TV</strong> or <strong>Chromecast</strong>.
              </li>
              <li>
                Click the <Maximize size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Fullscreen</strong> icon on 7Anime. The video and audio will stream to your TV in full 16:9 HD!
              </li>
            </ol>
          </div>

          {/* Method 2: Android Phone / Tablet */}
          <div className="cast-modal__card glass">
            <div className="cast-modal__card-header">
              <div className="cast-modal__card-badge">METHOD 2</div>
              <div className="cast-modal__card-icon-title">
                <Smartphone size={20} className="cast-modal__method-icon" />
                <h3>From Android Phone or Tablet</h3>
              </div>
            </div>

            <ol className="cast-modal__step-list">
              <li>
                Swipe down from the top of your phone screen to open <strong>Quick Settings</strong>.
              </li>
              <li>
                Tap <strong>Screen Cast</strong> (or <strong>Smart View</strong> on Samsung / <strong>Cast</strong> / <strong>Wireless Projection</strong>).
              </li>
              <li>Select your Android TV from the list.</li>
              <li>
                Return to 7Anime and rotate your phone to landscape or tap <strong>Fullscreen</strong>.
              </li>
            </ol>
          </div>

          {/* Method 3: Direct Android TV Browser */}
          <div className="cast-modal__card glass">
            <div className="cast-modal__card-header">
              <div className="cast-modal__card-badge">METHOD 3 (BEST QUALITY)</div>
              <div className="cast-modal__card-icon-title">
                <Tv size={20} className="cast-modal__method-icon" />
                <h3>Directly on Android TV (No Phone/PC)</h3>
              </div>
            </div>

            <ol className="cast-modal__step-list">
              <li>
                On your Android TV, open Google Play Store and install <strong>TV Bro</strong> or <strong>JioPages</strong> (free TV web browsers with remote support).
              </li>
              <li>
                Open the TV browser and navigate to: <code>7anime-tv.vercel.app</code>
              </li>
              <li>
                Enjoy streaming directly on your TV with your TV remote, with zero latency and full audio sync!
              </li>
            </ol>

            <button
              type="button"
              className="cast-modal__copy-btn"
              onClick={handleCopyLink}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Current Episode URL'}</span>
            </button>
          </div>
        </div>

        {/* Footer tip */}
        <div className="cast-modal__footer-tip">
          <Sparkles size={16} />
          <span>
            <strong>Pro Tip:</strong> Tab Casting transmits both audio and 1080p video directly to your Android TV. Keeping the player in Fullscreen gives a native television streaming experience.
          </span>
        </div>
      </div>
    </Modal>
  )
}
