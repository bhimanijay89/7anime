import { useState } from 'react'
import type { Anime } from '../../types/domain'
import './detail.css'

export function AnimeMetadataTabs({ anime }: { anime: Anime }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'details'>('overview')

  return (
    <section className="metadata-tabs glass" aria-label="Anime metadata and details">
      <nav className="metadata-tabs__nav" aria-label="Detail sections">
        <button
          className={`metadata-tabs__tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`metadata-tabs__tab ${activeTab === 'characters' ? 'active' : ''}`}
          onClick={() => setActiveTab('characters')}
        >
          Characters ({anime.characters?.length || 2})
        </button>
        <button
          className={`metadata-tabs__tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
      </nav>

      {activeTab === 'overview' && (
        <div className="tab-content">
          <p className="detail-hero__synopsis" style={{ WebkitLineClamp: 'none', maxWidth: 'none' }}>
            {anime.synopsis || `${anime.title} is an acclaimed ${anime.genres?.join(', ') || 'anime'} series produced by ${anime.studio || 'top animation studios'}. Follow the journey in ultra high definition.`}
          </p>
        </div>
      )}

      {activeTab === 'characters' && (
        <div className="tab-content character-grid">
          {anime.characters && anime.characters.length > 0 ? (
            anime.characters.map(char => (
              <div key={char.id} className="character-card">
                <img src={char.avatar} alt={char.name} />
                <div>
                  <strong>{char.name}</strong>
                  <small>{char.role} · {char.voiceActor?.name || 'CV Unassigned'}</small>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="character-card">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" alt="Lead Character" />
                <div>
                  <strong>Kira Vance</strong>
                  <small>Main · VA: Rie Takahashi</small>
                </div>
              </div>
              <div className="character-card">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" alt="Supporting Character" />
                <div>
                  <strong>Renji Sudo</strong>
                  <small>Supporting · VA: Mamoru Miyano</small>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="tab-content specs-grid">
          <div className="spec-item">
            <span>Studio</span>
            <strong>{anime.studio || 'Mappa'}</strong>
          </div>
          <div className="spec-item">
            <span>Source</span>
            <strong>{anime.source || 'Manga'}</strong>
          </div>
          <div className="spec-item">
            <span>Format</span>
            <strong>{anime.type || 'TV'} Series</strong>
          </div>
          <div className="spec-item">
            <span>Duration</span>
            <strong>{anime.duration || '24 minutes'}</strong>
          </div>
          <div className="spec-item">
            <span>Status</span>
            <strong>{anime.status}</strong>
          </div>
          <div className="spec-item">
            <span>Audio Tracks</span>
            <strong>Japanese, English</strong>
          </div>
        </div>
      )}
    </section>
  )
}
