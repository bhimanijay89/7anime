/**
 * 7Anime Party Play — Room Join Modal
 * Allows users to join a watch party via 8-character convenience code or invite link.
 */

import { useState, useEffect } from 'react'
import {
  Users,
  LogIn,
  LoaderCircle,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { Modal } from '../ui/Overlay'
import { usePartyPlay } from '../../context/PartyContext'
import type { PartyRoomDetails } from '../../types/party'
import './party.css'

export interface PartyJoinModalProps {
  open: boolean
  onClose: () => void
  onPartyJoined?: (room: PartyRoomDetails) => void
  onSwitchToCreate?: () => void
  initialCodeOrToken?: string
}

export function PartyJoinModal({
  open,
  onClose,
  onPartyJoined,
  onSwitchToCreate,
  initialCodeOrToken = '',
}: PartyJoinModalProps) {
  const { joinRoom } = usePartyPlay()
  const [inputVal, setInputVal] = useState(initialCodeOrToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (initialCodeOrToken) {
      setInputVal(initialCodeOrToken)
    }
  }, [initialCodeOrToken])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          setError(null)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  // Helper to extract code or token from URL if pasted as full link
  const cleanInput = (raw: string): string => {
    const trimmed = raw.trim()
    try {
      if (trimmed.includes('party=')) {
        const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
        const param = url.searchParams.get('party')
        if (param) return param
      }
    } catch {
      // Not a valid URL, treat as raw code/token
    }
    return trimmed
  }

  const handleJoin = async () => {
    const cleaned = cleanInput(inputVal)
    if (!cleaned) {
      setError('Please enter a valid 8-character room code or invite link.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const room = await joinRoom(cleaned)
      onPartyJoined?.(room)
      onClose()
      setInputVal('')
    } catch (err: any) {
      console.error('Failed to join room:', err)
      if (err.status === 429) {
        const retryAfter = err.details?.retryAfterSeconds || 60
        setCooldownSeconds(retryAfter)
        setError(`Too many join attempts. Cooldown: ${retryAfter}s remaining.`)
      } else if (err.status === 403) {
        setError('You are barred from this party (you were kicked or unauthorized).')
      } else if (err.status === 400 && err.message?.includes('capacity')) {
        setError('This watch party is already full (maximum 10 participants).')
      } else if (err.status === 404) {
        setError('Watch party not found. The room may have ended or expired.')
      } else {
        setError(err.message || 'Failed to join watch party.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Watch Party">
      <div className="party-modal">
        <div className="party-modal__header">
          <div>
            <h3 className="party-modal__title">Join Watch Party</h3>
            <p className="party-modal__subtitle">
              Enter an 8-character party code or paste an invite link to jump in.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 75, 75, 0.15)',
              border: '1px solid rgba(255, 75, 75, 0.3)',
              color: '#ff7081',
              padding: '0.65rem 0.85rem',
              borderRadius: '0.75rem',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}
          >
            {cooldownSeconds ? <Clock size={16} /> : <AlertCircle size={16} />}
            <span>{error}</span>
          </div>
        )}

        <div className="party-modal__field">
          <label className="party-modal__label">Room Code or Invite Link</label>
          <input
            type="text"
            placeholder="e.g. 7X9K2M4P"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value)
              if (error && !cooldownSeconds) setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && !cooldownSeconds) {
                handleJoin()
              }
            }}
            disabled={loading || cooldownSeconds !== null}
            className="party-modal__input party-modal__input--code"
            autoFocus
          />
          <p className="party-modal__tip">
            👥 Private rooms accommodate up to 10 participants with synchronized anime streams and real-time chat.
          </p>
        </div>

        <div className="party-modal__actions">
          <button
            type="button"
            className="party-modal__btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="party-modal__btn--primary"
            onClick={handleJoin}
            disabled={loading || !inputVal.trim() || cooldownSeconds !== null}
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Join Party
              </>
            )}
          </button>
        </div>

        {onSwitchToCreate && (
          <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: '1px solid var(--color-glass-border, rgba(220, 240, 255, 0.08))', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted, #748096)', marginRight: '0.5rem' }}>
              Want to host your own session?
            </span>
            <button
              type="button"
              onClick={onSwitchToCreate}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent, #55d8ff)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Create a Party
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
