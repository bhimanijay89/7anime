/**
 * 7Anime Party Play — Room Creation Modal
 * Allows users to configure and launch a new private Watch Party room.
 */

import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Users,
  Copy,
  Check,
  Play,
  Film,
  Tv,
  LoaderCircle,
  Volume2,
  Server,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { Modal } from '../ui/Overlay'
import { usePartyPlay } from '../../context/PartyContext'
import type { PartyAudioType, PartyServerId, PartyRoomDetails } from '../../types/party'
import './party.css'

export interface PartyCreateModalProps {
  open: boolean
  onClose: () => void
  onPartyCreated?: (room: PartyRoomDetails) => void
  currentAnime?: {
    id: number
    title: string
    poster?: string
    isMovie?: boolean
    totalEpisodes?: number
  } | null
}

export interface ServerOption {
  id: PartyServerId
  label: string
  provider: string
}

export const SERVER_OPTIONS: ServerOption[] = [
  { id: 'server1', label: 'Server 1', provider: 'Multi-Audio' },
  { id: 'server2', label: 'Server 2', provider: 'Sub & Dub' },
  { id: 'server3', label: 'Server 3', provider: 'Fast Stream' },
  { id: 'server4', label: 'Server 4', provider: 'Mirror Stream' },
]

export interface AudioOption {
  id: PartyAudioType
  label: string
}

export const AUDIO_OPTIONS: AudioOption[] = [
  { id: 'sub', label: 'Sub (Japanese)' },
  { id: 'dub', label: 'Dub (English)' },
]

interface PartySelectOption<T extends string> {
  id: T
  label: string
  provider?: string
}

interface PartySelectProps<T extends string> {
  id: string
  label: string
  icon?: React.ReactNode
  value: T
  options: PartySelectOption<T>[]
  onChange: (val: T) => void
  testId?: string
}

function PartySelect<T extends string>({
  id,
  label,
  icon,
  value,
  options,
  onChange,
  testId,
}: PartySelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((opt) => opt.id === value) || options[0]

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const currIndex = options.findIndex((opt) => opt.id === value)
        const nextIndex = (currIndex + 1) % options.length
        onChange(options[nextIndex].id)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const currIndex = options.findIndex((opt) => opt.id === value)
        const prevIndex = (currIndex - 1 + options.length) % options.length
        onChange(options[prevIndex].id)
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    }
  }

  return (
    <div className="party-modal__field party-custom-select-container" ref={containerRef} style={{ margin: 0, position: 'relative' }}>
      <label className="party-modal__label" htmlFor={`${id}-trigger`}>
        {icon}
        {label}
      </label>

      {/* Hidden real select for accessibility, automated tests (page.select), and form inspectors */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="party-modal__hidden-select party-modal__select"
        aria-hidden="true"
        tabIndex={-1}
        data-testid={testId}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} className="party-modal__option">
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom Liquid Glass Trigger Button */}
      <button
        id={`${id}-trigger`}
        type="button"
        className={`party-custom-select__trigger ${isOpen ? 'party-custom-select__trigger--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        data-testid={`${testId}-trigger`}
      >
        <span className="party-custom-select__value">{selectedOption.label}</span>
        <ChevronDown
          size={16}
          className={`party-custom-select__chevron ${isOpen ? 'party-custom-select__chevron--open' : ''}`}
        />
      </button>

      {/* Liquid Glass Dropdown Menu */}
      {isOpen && (
        <ul
          id={`${id}-menu`}
          className="party-custom-select__menu"
          role="listbox"
          aria-labelledby={`${id}-trigger`}
          data-testid={`${testId}-menu`}
        >
          {options.map((opt) => {
            const isSelected = opt.id === value
            return (
              <li
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                data-value={opt.id}
                data-testid={`${testId}-option-${opt.id}`}
                className={`party-custom-select__option ${isSelected ? 'party-custom-select__option--selected' : ''}`}
                onClick={() => {
                  onChange(opt.id)
                  setIsOpen(false)
                }}
              >
                <div className="party-custom-select__option-content">
                  <span className="party-custom-select__option-label">{opt.label}</span>
                  {opt.provider && (
                    <span className="party-custom-select__option-provider">{opt.provider}</span>
                  )}
                </div>
                {isSelected && <Check size={14} className="party-custom-select__check" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function PartyCreateModal({
  open,
  onClose,
  onPartyCreated,
  currentAnime,
}: PartyCreateModalProps) {
  const { createRoom, createInitialData } = usePartyPlay()

  // Configuration options
  const anilistId = createInitialData?.anilistId || currentAnime?.id || 21 // Fallback One Piece if none selected
  const isMovie = createInitialData?.mediaType === 'movie' || currentAnime?.isMovie || false
  const [episodeNumber, setEpisodeNumber] = useState<number>(createInitialData?.episodeNumber || 1)
  const [audioType, setAudioType] = useState<PartyAudioType>(createInitialData?.audioType || 'sub')
  const [serverId, setServerId] = useState<PartyServerId>(createInitialData?.serverId || 'server1')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdRoom, setCreatedRoom] = useState<PartyRoomDetails | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      const room = await createRoom({
        anilistId,
        mediaType: isMovie ? 'movie' : 'tv',
        episodeNumber: isMovie ? 1 : episodeNumber,
        audioType,
        serverId,
      })
      setCreatedRoom(room)
      onPartyCreated?.(room)
    } catch (err: any) {
      console.error('Failed to create room:', err)
      setError(err?.message || 'Failed to create watch party room.')
    } finally {
      setLoading(false)
    }
  }

  const getInviteUrl = () => {
    if (!createdRoom) return ''
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://7anime.app'
    // Use token if available, else code
    const param = createdRoom.inviteToken || createdRoom.code
    return `${base}/?party=${encodeURIComponent(param)}`
  }

  const handleCopyLink = () => {
    const url = getInviteUrl()
    if (url) {
      navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleCopyCode = () => {
    if (createdRoom?.code) {
      navigator.clipboard.writeText(createdRoom.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleDone = () => {
    onClose()
    setCreatedRoom(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Watch Party">
      <div className="party-modal">
        {!createdRoom ? (
          <div>
            <div className="party-modal__header">
              <div>
                <h3 className="party-modal__title">Create Watch Party</h3>
                <p className="party-modal__subtitle">
                  Watch together in real-time with synchronized streams and live chat.
                </p>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(255, 75, 75, 0.15)',
                  border: '1px solid rgba(255, 75, 75, 0.3)',
                  color: '#ff7081',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Anime Preview Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--color-glass-border, rgba(220, 240, 255, 0.1))',
                borderRadius: '0.875rem',
                padding: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              {currentAnime?.poster && (
                <img
                  src={currentAnime.poster}
                  alt={currentAnime.title}
                  style={{
                    width: '42px',
                    height: '56px',
                    borderRadius: '0.5rem',
                    objectFit: 'cover',
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginBottom: '0.2rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      background: 'rgba(85, 216, 255, 0.15)',
                      color: 'var(--color-accent, #55d8ff)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                    }}
                  >
                    {isMovie ? 'MOVIE' : 'ANIME SERIES'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-muted, #748096)',
                    }}
                  >
                    Private • Up to 10 Users
                  </span>
                </div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentAnime?.title || `Anime #${anilistId}`}
                </h4>
              </div>
            </div>

            {/* Stream Settings */}
            {!isMovie && (
              <div className="party-modal__field">
                <label className="party-modal__label">
                  <Layers size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Starting Episode
                </label>
                <input
                  type="number"
                  min={1}
                  max={currentAnime?.totalEpisodes || 2000}
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(Math.max(1, parseInt(e.target.value) || 1))}
                  className="party-modal__input"
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <PartySelect
                id="party-create-audio"
                label="Audio Language"
                icon={<Volume2 size={14} style={{ display: 'inline', marginRight: '4px' }} />}
                value={audioType}
                options={AUDIO_OPTIONS}
                onChange={(val) => setAudioType(val as PartyAudioType)}
                testId="party-audio-select"
              />

              <PartySelect
                id="party-create-server"
                label="Streaming Server"
                icon={<Server size={14} style={{ display: 'inline', marginRight: '4px' }} />}
                value={serverId}
                options={SERVER_OPTIONS}
                onChange={(val) => setServerId(val as PartyServerId)}
                testId="party-server-select"
              />
            </div>

            <p className="party-modal__tip">
              💡 All room participants can change episode, audio track, and server during the party. Playback streams stay synchronized in real time.
            </p>

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
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Creating Room...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Launch Watch Party
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Success Screen with Copyable Invite Link & Room Code */
          <div>
            <div className="party-modal__header">
              <div>
                <h3 className="party-modal__title" style={{ color: 'var(--color-accent, #55d8ff)' }}>
                  Watch Party Ready!
                </h3>
                <p className="party-modal__subtitle">
                  Share this room code or direct invite link with your friends.
                </p>
              </div>
            </div>

            <div className="party-created-card">
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #748096)', fontWeight: 600 }}>
                ROOM CODE
              </div>
              <div className="party-created-card__code-display">
                <span className="party-created-card__big-code">{createdRoom.code}</span>
                <button
                  type="button"
                  className="party-copy-btn"
                  onClick={handleCopyCode}
                  title="Copy room code"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  {copiedCode ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #748096)', fontWeight: 600, marginTop: '0.5rem' }}>
                DIRECT INVITE LINK
              </div>
              <div className="party-created-card__link-box">
                <span className="party-created-card__link-text">{getInviteUrl()}</span>
                <button
                  type="button"
                  className="party-copy-btn"
                  onClick={handleCopyLink}
                  title="Copy invite link"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Copied Link' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="party-modal__actions">
              <button
                type="button"
                className="party-modal__btn--primary"
                onClick={handleDone}
              >
                <Play size={18} />
                Enter Watch Party
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
