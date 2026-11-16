/**
 * 7Anime Party Play — Live Chat & Participants Drawer
 * Liquid Glass floating panel supporting real-time chat, emoji reactions, and participant moderation.
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  Users,
  X,
  Send,
  Crown,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Trash2,
  ShieldAlert,
  Radio,
} from 'lucide-react'
import { usePartyPlay } from '../../context/PartyContext'
import type { PartyMessage, PartyParticipant, PartyServerId } from '../../types/party'
import './party.css'

function formatServerName(serverId: string): string {
  switch (serverId) {
    case 'server1':
      return 'Server 1'
    case 'server2':
      return 'Server 2'
    case 'server3':
      return 'Server 3'
    case 'server4':
      return 'Server 4'
    default:
      return serverId
  }
}

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😮', '👏', '🎉', '😭', '✨']

export function PartyDrawer({ currentUserId }: { currentUserId?: string }) {
  const {
    room,
    isHost,
    isDrawerOpen,
    activeTab,
    toggleDrawer,
    setActiveTab,
    sendMessage,
    sendReaction,
    leaveRoom,
    closeRoom,
    kickMember,
    rotateInviteToken,
    syncPlayback,
  } = usePartyPlay()

  const [chatInput, setChatInput] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [rotatingToken, setRotatingToken] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (activeTab === 'chat' && isDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [room?.messages.length, activeTab, isDrawerOpen])

  if (!room || !isDrawerOpen) return null

  const activeParticipants = room.participants.filter(
    (p) => p.status === 'ACTIVE' || p.status === 'DISCONNECTED'
  )

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim()) return

    sendMessage(chatInput)
    setChatInput('')
  }

  const handleCopyLink = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://7anime.app'
    const param = room.inviteToken || room.code
    const url = `${base}/?party=${encodeURIComponent(param)}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleRotateToken = async () => {
    try {
      setRotatingToken(true)
      await rotateInviteToken()
    } finally {
      setRotatingToken(false)
    }
  }

  const handleKick = (p: PartyParticipant) => {
    const name = p.user.displayName || p.user.username
    if (window.confirm(`Are you sure you want to kick ${name} from this watch party?`)) {
      kickMember(p.userId)
    }
  }

  const handleCloseParty = () => {
    if (window.confirm('Are you sure you want to close this watch party? This will disconnect all participants and delete the room permanently.')) {
      closeRoom()
    }
  }

  const handleLeaveParty = () => {
    if (window.confirm('Are you sure you want to leave this watch party?')) {
      leaveRoom()
    }
  }

  const handleSelectServer = (srv: PartyServerId) => {
    if (!room || room.playback.serverId === srv) return
    syncPlayback({
      anilistId: room.playback.anilistId,
      episodeNumber: room.playback.episodeNumber,
      audioType: room.playback.audioType,
      serverId: srv,
    })
  }

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <aside className="party-drawer" aria-label="Watch Party Drawer">
      {/* Header */}
      <div className="party-drawer__header">
        <div className="party-drawer__title-area">
          <div className="party-bar__live-pill">
            <span className="party-bar__live-dot" />
            <span>Party</span>
          </div>
          <h3 className="party-drawer__title">Room {room.code}</h3>
        </div>

        <button
          type="button"
          className="party-drawer__close"
          onClick={toggleDrawer}
          aria-label="Close party drawer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="party-drawer__tabs">
        <button
          type="button"
          className={`party-drawer__tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} />
          <span>Chat</span>
          {room.messages.length > 0 && (
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
              ({room.messages.length})
            </span>
          )}
        </button>

        <button
          type="button"
          className={`party-drawer__tab ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          <Users size={16} />
          <span>Members</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
            ({activeParticipants.length}/{room.maxParticipants})
          </span>
        </button>
      </div>

      {/* Synchronized Stream & Multi-Server Controls */}
      <div className="party-drawer__stream-card">
        <div className="party-drawer__stream-row">
          <div className="party-drawer__stream-meta">
            <Radio size={14} className="party-drawer__stream-icon" />
            <span className="party-drawer__stream-ep">
              Episode {room.playback.episodeNumber}
            </span>
            <span className="party-drawer__audio-pill">
              {room.playback.audioType.toUpperCase()}
            </span>
          </div>
          <span className="party-drawer__active-server">
            {formatServerName(room.playback.serverId)}
          </span>
        </div>

        <div className="party-drawer__servers-grid" role="group" aria-label="Party Streaming Servers">
          {(['server1', 'server2', 'server3', 'server4'] as PartyServerId[]).map((srv) => {
            const isActive = room.playback.serverId === srv
            return (
              <button
                key={srv}
                type="button"
                className={`party-drawer__server-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectServer(srv)}
                title={`Switch party stream to ${formatServerName(srv)}`}
                aria-pressed={isActive}
              >
                <span className="party-drawer__server-name">
                  {srv === 'server1' ? 'Server 1' : srv === 'server2' ? 'Server 2' : srv === 'server3' ? 'Server 3' : 'Server 4'}
                </span>
                <span className="party-drawer__server-provider">
                  {srv === 'server1' ? 'AnimeTVPlus (MAL)' : srv === 'server2' ? 'AnimeTVPlus (Ani)' : srv === 'server3' ? 'MegaPlay (Ani)' : 'MegaPlay (MAL)'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Body: Chat Stream */}
      {activeTab === 'chat' && (
        <>
          <div className="party-drawer__body">
            {room.messages.length === 0 ? (
              <div className="party-empty">
                <MessageSquare size={36} className="party-empty__icon" />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>
                  No messages yet
                </p>
                <span style={{ fontSize: '0.78rem' }}>
                  Say hello or drop an emoji reaction to start the party!
                </span>
              </div>
            ) : (
              room.messages.map((msg) => {
                const isOwn = currentUserId ? msg.userId === currentUserId : false
                const isHostMsg = room.ownerId === msg.userId

                return (
                  <div
                    key={msg.id}
                    className={`party-chat-msg ${isOwn ? 'party-chat-msg--own' : ''}`}
                  >
                    <img
                      src={msg.user.avatar || '/assets/avatars/goku.jpg'}
                      alt={msg.user.username}
                      className="party-chat-msg__avatar"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src =
                          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
                      }}
                    />

                    <div className="party-chat-msg__bubble">
                      <div className="party-chat-msg__header">
                        <span className="party-chat-msg__name">
                          {msg.user.displayName || msg.user.username}
                          {isHostMsg && (
                            <span title="Host" style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <Crown size={12} style={{ color: '#ffc969' }} />
                            </span>
                          )}
                        </span>
                        <span className="party-chat-msg__time">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="party-chat-msg__text">{msg.content}</p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Reactions Bar */}
          <div className="party-reactions-bar">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="party-reactions-bar__btn"
                onClick={() => sendReaction(emoji)}
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="party-drawer__footer">
            <form onSubmit={handleSendChat} className="party-drawer__input-form">
              <input
                type="text"
                placeholder="Send a message..."
                maxLength={500}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="party-drawer__input"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="party-drawer__send-btn"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </>
      )}

      {/* Body: Participants List */}
      {activeTab === 'participants' && (
        <div className="party-drawer__body">
          {/* Room Invite Card */}
          <div
            style={{
              background: 'rgba(85, 216, 255, 0.06)',
              border: '1px solid rgba(85, 216, 255, 0.15)',
              borderRadius: '0.875rem',
              padding: '0.85rem',
              marginBottom: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #748096)', fontWeight: 600 }}>
                INVITE FRIENDS
              </span>
              <button
                type="button"
                className="party-copy-btn"
                onClick={handleCopyCode}
              >
                {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                Code: {room.code}
              </button>
            </div>

            <button
              type="button"
              className="party-modal__btn--secondary"
              style={{ minHeight: '34px', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              {copiedLink ? 'Invite Link Copied!' : 'Copy Direct Invite Link'}
            </button>

            {isHost && (
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted, #748096)',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
                onClick={handleRotateToken}
                disabled={rotatingToken}
              >
                <RefreshCw size={11} className={rotatingToken ? 'animate-spin' : ''} />
                Rotate Invite Link (Revoke old links)
              </button>
            )}
          </div>

          <div className="party-participants-list">
            {activeParticipants.map((p) => {
              const isUserHost = p.role === 'HOST'
              const isCurrentUser = currentUserId ? p.userId === currentUserId : false

              return (
                <div key={p.id} className="party-participant-item">
                  <div className="party-participant-item__info">
                    <div className="party-participant-item__avatar-wrap">
                      <img
                        src={p.user.avatar || '/assets/avatars/goku.jpg'}
                        alt={p.user.username}
                        className="party-participant-item__avatar"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src =
                            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
                        }}
                      />
                      <span
                        className={`party-participant-item__status-dot party-participant-item__status-dot--${
                          p.status === 'ACTIVE' ? 'active' : 'disconnected'
                        }`}
                        title={p.status === 'ACTIVE' ? 'Active' : 'Disconnected'}
                      />
                    </div>

                    <div className="party-participant-item__names">
                      <div className="party-participant-item__name">
                        {p.user.displayName || p.user.username}
                        {isCurrentUser && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #748096)' }}>
                            (You)
                          </span>
                        )}
                        <span
                          className={`party-participant-item__role-badge party-participant-item__role-badge--${
                            isUserHost ? 'host' : 'member'
                          }`}
                        >
                          {isUserHost ? '👑 Host' : 'Member'}
                        </span>
                      </div>
                      <div className="party-participant-item__sub">
                        @{p.user.username}
                      </div>
                    </div>
                  </div>

                  <div className="party-participant-item__actions">
                    {isHost && !isUserHost && (
                      <button
                        type="button"
                        className="party-btn--danger-sm"
                        onClick={() => handleKick(p)}
                        title="Kick from party"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Room Controls (Leave / Close) */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            {isHost ? (
              <button
                type="button"
                className="party-modal__btn--secondary"
                style={{
                  width: '100%',
                  color: '#ff7081',
                  borderColor: 'rgba(255, 112, 129, 0.3)',
                  background: 'rgba(255, 112, 129, 0.08)',
                }}
                onClick={handleCloseParty}
              >
                <Trash2 size={16} />
                Close Watch Party (End for all)
              </button>
            ) : (
              <button
                type="button"
                className="party-modal__btn--secondary"
                style={{ width: '100%' }}
                onClick={handleLeaveParty}
              >
                <LogOut size={16} />
                Leave Watch Party
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
