/**
 * 7Anime Party Play — Floating Reaction Particles Overlay
 * Renders animated emoji bursts that glide upwards over the video player.
 */

import React from 'react'
import { usePartyPlay } from '../../context/PartyContext'
import './party.css'

export function PartyReactionOverlay() {
  const { reactions } = usePartyPlay()

  if (reactions.length === 0) return null

  return (
    <div className="party-reactions-overlay" aria-hidden="true">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="party-reaction-bubble"
          style={{
            left: `${r.leftPercent}%`,
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  )
}
