/**
 * 7Anime Party Play — Party Closed Modal
 * Informative Liquid Glass dialog shown when a watch party is closed or destroyed.
 */

import React from 'react'
import { LogOut, Home, Compass } from 'lucide-react'
import { Modal } from '../ui/Overlay'
import { usePartyPlay } from '../../context/PartyContext'
import './party.css'

export interface PartyClosedModalProps {
  onNavigateHome?: () => void
}

export function PartyClosedModal({ onNavigateHome }: PartyClosedModalProps) {
  const { closedInfo, dismissClosedModal } = usePartyPlay()

  if (!closedInfo) return null

  const getReasonMessage = () => {
    switch (closedInfo.reason) {
      case 'HOST_CLOSED':
        return 'The host closed this watch party. All participants have been disconnected.'
      case 'HOST_LEFT':
        return 'The host left the watch party. As private rooms belong to the host, the party has ended.'
      case 'HOST_STREAM_CLOSED':
        return 'The host closed their playback stream.'
      case 'HOST_GRACE_EXPIRED':
        return 'The host disconnected and the 60-second reconnect window expired.'
      case 'AUTO_EXPIRED':
        return 'This watch party has reached its maximum duration and expired.'
      default:
        return closedInfo.message || 'The watch party has ended.'
    }
  }

  const handleClose = () => {
    dismissClosedModal()
    onNavigateHome?.()
  }

  return (
    <Modal open={true} onClose={handleClose} title="Watch Party Ended">
      <div className="party-modal">
        <div className="party-modal__header">
          <div>
            <h3 className="party-modal__title" style={{ color: '#ff7081' }}>
              Watch Party Ended
            </h3>
            <p className="party-modal__subtitle">{getReasonMessage()}</p>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 112, 129, 0.08)',
            border: '1px solid rgba(255, 112, 129, 0.2)',
            borderRadius: '0.875rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary, #aeb8ca)',
            lineHeight: 1.5,
          }}
        >
          All temporary room history and chat messages have been permanently deleted from the database in accordance with privacy safeguards.
        </div>

        <div className="party-modal__actions">
          <button
            type="button"
            className="party-modal__btn--primary"
            onClick={handleClose}
          >
            <Compass size={18} />
            Browse Other Anime
          </button>
        </div>
      </div>
    </Modal>
  )
}
