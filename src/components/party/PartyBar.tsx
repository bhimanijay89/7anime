/**
 * 7Anime Party Play — Floating Top Party Status Bar
 * Displays live room status, room code, stream sync info, and drawer toggle buttons.
 */

import React, { useState } from 'react'
import {
  Users,
  MessageSquare,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Radio,
} from 'lucide-react'
import { usePartyPlay } from '../../context/PartyContext'
import type { PartyServerId } from '../../types/party'
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

export function PartyBar() {
  const {
    room,
    isDrawerOpen,
    unreadMessages,
    hostGraceCountdown,
    toggleDrawer,
    setActiveTab,
    syncPlayback,
  } = usePartyPlay()

  const [copiedCode, setCopiedCode] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  if (!room) return null

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
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

  const handleOpenChat = () => {
    setActiveTab('chat')
    if (!isDrawerOpen) toggleDrawer()
  }

  const handleOpenMembers = () => {
    setActiveTab('participants')
    if (!isDrawerOpen) toggleDrawer()
  }

  const activeCount = room.participants.filter(
    (p) => p.status === 'ACTIVE' || p.status === 'DISCONNECTED'
  ).length

  return (
    <div style={{ width: '100%', marginBottom: '0.75rem' }}>
      {/* Host Disconnect Grace Warning Banner */}
      {hostGraceCountdown !== null && (
        <div className="party-grace-banner">
          <div className="party-grace-banner__content">
            <AlertTriangle size={18} />
            <span>
              <strong>Host disconnected:</strong> Room will close in{' '}
              <span className="party-grace-banner__countdown">{hostGraceCountdown}s</span> unless
              the host returns.
            </span>
          </div>
        </div>
      )}

      {/* Main Party Bar */}
      <div className="party-bar">
        <div className="party-bar__left">
          <div className="party-bar__live-pill">
            <span className="party-bar__live-dot" />
            <span>Party</span>
          </div>

          <button
            type="button"
            className="party-bar__code"
            onClick={handleCopyCode}
            title="Click to copy room code"
          >
            {copiedCode ? 'COPIED!' : room.code}
          </button>

          <div className="party-bar__stream-info-wrap">
            <span className="party-bar__stream-info">
              Ep {room.playback.episodeNumber} • {room.playback.audioType.toUpperCase()}
            </span>

            <div className="party-bar__servers" role="group" aria-label="Streaming Server Selection">
              {(['server1', 'server2', 'server3', 'server4'] as PartyServerId[]).map((srv) => {
                const isActive = room.playback.serverId === srv
                return (
                  <button
                    key={srv}
                    type="button"
                    className={`party-bar__server-chip ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectServer(srv)}
                    title={`Switch party stream to ${formatServerName(srv)}`}
                    aria-pressed={isActive}
                  >
                    <Radio size={11} />
                    <span>{formatServerName(srv)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="party-bar__right">
          {/* Honest sync info tooltip */}
          <button
            type="button"
            className="party-bar__btn icon-only"
            onClick={() => setShowInfo(!showInfo)}
            title="Stream Synchronization Info"
            aria-label="Stream Synchronization Info"
            style={{ width: '34px', padding: 0, justifyContent: 'center' }}
          >
            <Info size={16} />
          </button>

          {/* Members button */}
          <button
            type="button"
            className="party-bar__btn"
            onClick={handleOpenMembers}
            title="View participants"
          >
            <Users size={15} />
            <span>{activeCount}</span>
          </button>

          {/* Chat button */}
          <button
            type="button"
            className="party-bar__btn"
            onClick={handleOpenChat}
            title="Open party chat"
          >
            <MessageSquare size={15} />
            <span>Chat</span>
            {unreadMessages > 0 && (
              <span className="party-bar__badge">{unreadMessages}</span>
            )}
          </button>
        </div>
      </div>

      {/* Honest Info Box */}
      {showInfo && (
        <div
          style={{
            background: 'rgba(14, 19, 31, 0.95)',
            border: '1px solid var(--color-glass-border, rgba(220, 240, 255, 0.12))',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary, #aeb8ca)',
            marginBottom: '0.75rem',
            lineHeight: 1.45,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          }}
        >
          <strong style={{ color: 'var(--color-accent, #55d8ff)' }}>7Anime Synchronized Stream:</strong>{' '}
          Episode, audio track (Sub/Dub), and streaming servers are synchronized live for all participants. If anyone selects a different episode or server, everyone&apos;s player updates automatically. Play/pause is controlled locally for maximum video buffering reliability.
        </div>
      )}
    </div>
  )
}
