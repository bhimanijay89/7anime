/**
 * 7Anime Party Play — Live Chat & Participants Drawer / Mobile Bottom Sheet
 * Liquid Glass panel supporting real-time chat, emoji reactions, participant moderation,
 * and responsive mobile bottom-sheet experience.
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
  Radio,
  Smile,
  Settings,
  Share2,
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

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😮', '👏', '🎉', '😭', '✨', '🍿', '⚡', '💯', '🚀']

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
  const [isMobileExpanded, setIsMobileExpanded] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (activeTab === 'chat' && isDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [room?.messages.length, activeTab, isDrawerOpen])

  if (!room || !isDrawerOpen) return null

  // Authoritative active participants list (filters out LEFT and KICKED)
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
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://7anime-tv.vercel.app'
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

  const handleShareLink = async () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://7anime-tv.vercel.app'
    const param = room.inviteToken || room.code
    const url = `${base}/?party=${encodeURIComponent(param)}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my 7Anime Watch Party (Room ${room.code})`,
          text: `Watch anime together in real time on 7Anime! Join room: ${room.code}`,
          url,
        })
      } catch {
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
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
    const name = p.user?.displayName || p.user?.username || 'Member'
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
    <>
      {/* Mobile Backdrop for Bottom Sheet */}
      <div
        className="party-bottom-sheet__backdrop"
        onClick={toggleDrawer}
        aria-hidden="true"
      />

      <aside
        className={`party-drawer party-bottom-sheet ${isMobileExpanded ? 'party-bottom-sheet--expanded' : 'party-bottom-sheet--collapsed'}`}
        aria-label="Watch Party Drawer and Bottom Sheet"
      >
        {/* Mobile Drag Handle */}
        <div
          className="party-bottom-sheet__drag-area"
          onClick={() => setIsMobileExpanded((prev) => !prev)}
          title="Toggle Bottom Sheet Height"
        >
          <div className="party-bottom-sheet__drag-handle" />
        </div>

        {/* Compact Room Header */}
        <div className="party-drawer__header">
          <div className="party-drawer__title-area">
            <div className="party-bar__live-pill">
              <span className="party-bar__live-dot" />
              <span>Party</span>
            </div>
            <h3 className="party-drawer__title">Room {room.code}</h3>
            {isHost && (
              <span className="party-participant-item__role-badge party-participant-item__role-badge--host" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                Host
              </span>
            )}
          </div>

          <div className="party-drawer__header-actions">
            <button
              type="button"
              className="party-copy-btn party-drawer__header-copy"
              onClick={handleCopyCode}
              title="Copy room code"
            >
              {copiedCode ? <Check size={12} /> : <Copy size={12} />}
              <span className="party-drawer__code-text">{room.code}</span>
            </button>

            <button
              type="button"
              className="party-drawer__close"
              onClick={toggleDrawer}
              aria-label="Close party drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 4 Responsive Tabs (Members, Chat, Reactions, Room) */}
        <div className="party-drawer__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chat'}
            className={`party-drawer__tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={15} />
            <span>Chat</span>
            {room.messages.length > 0 && (
              <span className="party-drawer__tab-count">
                ({room.messages.length})
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'participants'}
            className={`party-drawer__tab ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            <Users size={15} />
            <span>Members</span>
            <span className="party-drawer__tab-count">
              ({activeParticipants.length}/{room.maxParticipants})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reactions'}
            className={`party-drawer__tab ${activeTab === 'reactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('reactions')}
          >
            <Smile size={15} />
            <span>Reactions</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'room'}
            className={`party-drawer__tab ${activeTab === 'room' ? 'active' : ''}`}
            onClick={() => setActiveTab('room')}
          >
            <Settings size={15} />
            <span>Room</span>
          </button>
        </div>

        {/* =========================================================
            TAB 1: CHAT
        ========================================================= */}
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
                    Say hello or drop a reaction to start the party!
                  </span>
                </div>
              ) : (
                room.messages.map((msg) => {
                  const isOwn = currentUserId ? msg.userId === currentUserId : false
                  const isHostMsg = room.ownerId === msg.userId
                  const authorName = msg.user?.displayName || msg.user?.username || 'Member'
                  const authorAvatar = msg.user?.avatar || '/assets/avatars/goku.jpg'

                  return (
                    <div
                      key={msg.id}
                      className={`party-chat-msg ${isOwn ? 'party-chat-msg--own' : ''}`}
                    >
                      <img
                        src={authorAvatar}
                        alt={authorName}
                        className="party-chat-msg__avatar"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src =
                            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
                        }}
                      />

                      <div className="party-chat-msg__bubble">
                        <div className="party-chat-msg__header">
                          <span className="party-chat-msg__name">
                            {authorName}
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

            {/* Quick Emoji Reactions Bar */}
            <div className="party-reactions-bar">
              {QUICK_EMOJIS.slice(0, 8).map((emoji) => (
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

        {/* =========================================================
            TAB 2: MEMBERS (AUTHORITATIVE PARTICIPANTS LIST)
        ========================================================= */}
        {activeTab === 'participants' && (
          <div className="party-drawer__body">
            <div className="party-participants-header">
              <span className="party-participants-header__title">
                Active Participants ({activeParticipants.length}/{room.maxParticipants})
              </span>
              <button
                type="button"
                className="party-copy-btn"
                onClick={handleShareLink}
              >
                <Share2 size={12} />
                Share
              </button>
            </div>

            <div className="party-participants-list">
              {activeParticipants.map((p) => {
                const isUserHost = p.role === 'HOST'
                const isCurrentUser = currentUserId ? p.userId === currentUserId : false
                const name = p.user?.displayName || p.user?.username || 'Member'
                const avatar = p.user?.avatar || '/assets/avatars/goku.jpg'
                const handle = p.user?.username ? `@${p.user.username}` : ''

                return (
                  <div key={p.id} className="party-participant-item">
                    <div className="party-participant-item__info">
                      <div className="party-participant-item__avatar-wrap">
                        <img
                          src={avatar}
                          alt={name}
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
                          <span>{name}</span>
                          {isCurrentUser && (
                            <span className="party-participant-item__you-tag">
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
                        {handle && (
                          <div className="party-participant-item__sub">
                            {handle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="party-participant-item__actions">
                      {isHost && !isUserHost && (
                        <button
                          type="button"
                          className="party-btn--danger-sm"
                          onClick={() => handleKick(p)}
                          title={`Kick ${name} from party`}
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: REACTIONS (EXPANDED EMOJI GRID)
        ========================================================= */}
        {activeTab === 'reactions' && (
          <div className="party-drawer__body">
            <div className="party-reactions-section">
              <h4 className="party-reactions-section__title">
                Tap an emoji to send a live reaction
              </h4>
              <p className="party-reactions-section__desc">
                Reactions float across the video player for everyone in the room.
              </p>

              <div className="party-reactions-grid">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="party-reactions-grid__btn"
                    onClick={() => {
                      sendReaction(emoji)
                    }}
                    title={`Send ${emoji}`}
                  >
                    <span className="party-reactions-grid__emoji">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: ROOM & STREAM CONTROLS
        ========================================================= */}
        {activeTab === 'room' && (
          <div className="party-drawer__body">
            {/* Synchronized Stream & Multi-Server Controls */}
            <div className="party-drawer__stream-card" style={{ marginBottom: '1rem' }}>
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
                        {srv === 'server1' ? 'Multi-Audio' : srv === 'server2' ? 'Sub & Dub' : srv === 'server3' ? 'Fast Stream' : 'Mirror Stream'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Room Invite Card */}
            <div className="party-room-invite-card">
              <div className="party-room-invite-card__header">
                <span className="party-room-invite-card__title">
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

              <div className="party-room-invite-card__actions">
                <button
                  type="button"
                  className="party-modal__btn--secondary"
                  onClick={handleShareLink}
                >
                  <Share2 size={14} />
                  Share Party Link
                </button>

                <button
                  type="button"
                  className="party-modal__btn--secondary"
                  onClick={handleCopyLink}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Invite Link Copied!' : 'Copy Direct Link'}
                </button>
              </div>

              {isHost && (
                <button
                  type="button"
                  className="party-room-invite-card__rotate"
                  onClick={handleRotateToken}
                  disabled={rotatingToken}
                >
                  <RefreshCw size={11} className={rotatingToken ? 'animate-spin' : ''} />
                  Rotate Invite Link (Revoke old links)
                </button>
              )}
            </div>

            {/* Room Controls (Leave / Close) */}
            <div className="party-room-danger-actions" style={{ marginTop: '1.25rem' }}>
              {isHost ? (
                <button
                  type="button"
                  className="party-modal__btn--secondary party-btn--close"
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
    </>
  )
}
