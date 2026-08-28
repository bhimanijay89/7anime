import React from 'react'
import { ShieldAlert, RefreshCw, Film, Sparkles } from 'lucide-react'
import { previewAnime, trendingAnime } from '../../data/anime'
import { Button } from '../ui/Button'
import { AnimeCard } from '../anime/AnimeCard'

export const DevToolsDecoyView: React.FC = () => {
  const combinedMockFeed = [...trendingAnime, ...previewAnime].slice(0, 8)

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#080c14',
        backgroundImage: 'radial-gradient(ellipse at top, #0e1828 0%, #080c14 70%)',
        color: '#f5f8ff',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Header Notice Banner */}
        <div
          style={{
            backgroundColor: 'rgba(14, 22, 36, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(85, 216, 255, 0.25)',
            borderRadius: '16px',
            padding: 'var(--space-5) var(--space-6)',
            marginBottom: 'var(--space-8)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(85, 216, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(85, 216, 255, 0.12)',
              border: '1px solid rgba(85, 216, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#55d8ff',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={26} />
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(85, 216, 255, 0.15)',
                color: '#55d8ff',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              <Sparkles size={12} /> 7anime Offline Inspection Decoy
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2px 0 4px 0', color: '#ffffff' }}>
              Developer Tools Active — Pre-cached Demo Feed
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#aeb8ca', lineHeight: 1.4 }}>
              Active inspection mode detected. Live database queries, user progress mutations, and streaming API endpoints are suspended. Displaying static cached demonstration content.
            </p>
          </div>

          <Button
            variant="glass"
            onClick={() => window.location.reload()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={15} /> Re-sync Session
          </Button>
        </div>

        {/* Demo Content Grid */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#f5f8ff',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Film size={18} style={{ color: '#55d8ff' }} /> Offline Demo Feed (Pre-cached Catalog)
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {combinedMockFeed.map(anime => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
