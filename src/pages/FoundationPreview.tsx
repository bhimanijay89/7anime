import { ArrowLeft, Calendar, Play, Plus, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Anime, Episode } from '../types/domain'
import { AnimeCard } from '../components/anime/AnimeCard'
import { AnimeDetailHero } from '../components/anime/AnimeDetailHero'
import { AnimeMetadataTabs } from '../components/anime/AnimeMetadataTabs'
import { DiscoveryCatalog } from '../components/anime/DiscoveryCatalog'
import { EpisodeList } from '../components/anime/EpisodeList'
import { Top10Hero } from '../components/carousel/CinematicCarousel'
import { ContentRail } from '../components/carousel/ContentRail'
import { DesktopNavbar, MobileNavigation, type ViewMode } from '../components/navigation/Navigation'
import { FullPlayerView } from '../components/player/FullPlayerView'
import { LibraryView } from '../components/profile/LibraryView'
import { ProfileFullView } from '../components/profile/ProfileFullView'
import { SearchOverlay } from '../components/search/SearchOverlay'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Overlay'
import { ToastProvider, useToast } from '../components/ui/Toast'
import { continueWatching, previewAnime, previewUser, top10Anime, trendingAnime } from '../data/anime'
import './preview.css'

function Home() {
  const [currentView, setCurrentView] = useState<ViewMode>('home')
  const [selectedAnime, setSelectedAnime] = useState<Anime>(previewAnime[0])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | undefined>(undefined)
  const [savedLibrary, setSavedLibrary] = useState<Anime[]>([previewAnime[0], previewAnime[1], previewAnime[2]])
  const [search, setSearch] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const { notify } = useToast()

  useEffect(() => {
    const titles: Record<ViewMode, string> = {
      home: '7anime — Premium Anime Streaming',
      detail: `${selectedAnime.title} — 7anime`,
      player: `Playing ${selectedAnime.title} — 7anime`,
      library: 'My Library — 7anime',
      profile: 'My Space — 7anime'
    }
    document.title = titles[currentView] || '7anime'
  }, [currentView, selectedAnime.title])

  const navigateTo = (view: ViewMode) => {
    setCurrentView(view)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const openDetail = (anime: Anime) => {
    setSelectedAnime(anime)
    navigateTo('detail')
  }

  const openFullPlayer = (ep?: Episode) => {
    setSelectedEpisode(ep)
    navigateTo('player')
  }

  const handleRemoveFromLibrary = (animeId: string) => {
    setSavedLibrary(prev => prev.filter(item => item.id !== animeId))
    notify('Title removed from your library.', 'info')
  }

  const handleAddToList = (anime: Anime) => {
    if (!savedLibrary.find(item => item.id === anime.id)) {
      setSavedLibrary(prev => [...prev, anime])
      notify(`${anime.title} added to your library!`, 'success')
    } else {
      notify(`${anime.title} is already in your library.`, 'info')
    }
  }

  // Upcoming anime from mock data
  const upcomingAnime = previewAnime.filter(a => a.status === 'Upcoming')

  return <>
    <DesktopNavbar
      onSearch={() => setSearch(true)}
      onMenu={() => setDrawer(true)}
      onNavigate={navigateTo}
      currentView={currentView}
    />
    <main id="top" className="home">
      {currentView === 'player' ? (
        <FullPlayerView
          anime={selectedAnime}
          initialEpisode={selectedEpisode}
          onBack={() => navigateTo('detail')}
        />
      ) : currentView === 'library' ? (
        <LibraryView
          savedAnime={savedLibrary}
          onSelectAnime={openDetail}
          onRemoveFromLibrary={handleRemoveFromLibrary}
        />
      ) : currentView === 'profile' ? (
        <ProfileFullView user={previewUser} />
      ) : currentView === 'home' ? (
        <>
          {/* ─── 1. Top 10 Hero ─── */}
          <Top10Hero
            anime={top10Anime}
            onSelect={openDetail}
            onAddToList={handleAddToList}
          />

          {/* ─── 2. Quick Actions ─── */}
          <section className="home-quick glass" aria-label="Quick discovery">
            <span><Sparkles size={17} />Curated for your evening</span>
            <div>
              <Button onClick={() => openDetail(previewAnime[0])}>
                Start watching <Play size={15} fill="currentColor" />
              </Button>
              <Button variant="ghost" onClick={() => navigateTo('library')}>
                <Plus size={16} /> My list ({savedLibrary.length})
              </Button>
            </div>
          </section>

          {/* ─── 3. Continue Watching ─── */}
          <ContentRail title="Continue watching">
            {continueWatching.map(anime => (
              <AnimeCard anime={anime} variant="continue" key={anime.id} onSelect={openDetail} />
            ))}
          </ContentRail>

          {/* ─── 4. Trending Now ─── */}
          <section className="home-section-head">
            <div>
              <p className="eyebrow">Handpicked today</p>
              <h2>Trending now</h2>
            </div>
            <p>Stories finding their audience right now.</p>
          </section>
          <ContentRail title="Popular with 7anime viewers">
            {trendingAnime.map(anime => (
              <AnimeCard anime={anime} key={anime.id} onSelect={openDetail} />
            ))}
          </ContentRail>

          {/* ─── 5. Upcoming Section ─── */}
          <section className="home-upcoming glass" aria-label="Upcoming anime">
            <div className="home-upcoming__content">
              <p className="eyebrow"><Calendar size={13} /> Coming soon</p>
              <h2>Fresh worlds are almost here.</h2>
              <p>Keep an eye on the next wave of original stories, seasonal favorites, and films.</p>
              <div className="home-upcoming__cards">
                {upcomingAnime.length > 0 ? (
                  upcomingAnime.map(anime => (
                    <article key={anime.id} className="home-upcoming__card glass-interactive" onClick={() => openDetail(anime)}>
                      <img src={anime.poster} alt={anime.title} loading="lazy" />
                      <div>
                        <h3>{anime.title}</h3>
                        <div className="home-upcoming__card-meta">
                          {anime.type && <Badge tone="neutral">{anime.type}</Badge>}
                          {anime.year && <Badge tone="neutral">{anime.year}</Badge>}
                          <Badge tone="warning">Upcoming</Badge>
                        </div>
                        {anime.synopsis && <p>{anime.synopsis}</p>}
                      </div>
                    </article>
                  ))
                ) : (
                  <p style={{ color: 'var(--color-text-muted)' }}>No upcoming titles at the moment.</p>
                )}
              </div>
              <Button variant="glass" onClick={() => openDetail(previewAnime[3])}>Browse upcoming</Button>
            </div>
            <div className="home-upcoming__art" aria-hidden="true" />
          </section>

          {/* ─── 6. Top Rated ─── */}
          <ContentRail title="Top rated">
            {[...previewAnime].sort((a, b) => (b.rating || 0) - (a.rating || 0)).map((anime, index) => (
              <AnimeCard anime={anime} variant="ranked" rank={index + 1} key={`${anime.id}-${index}`} onSelect={openDetail} />
            ))}
          </ContentRail>

          {/* ─── 7. Discovery ─── */}
          <DiscoveryCatalog anime={trendingAnime} />
        </>
      ) : (
        <div className="anime-detail">
          <div style={{ margin: 'var(--space-4) 0 0 0' }}>
            <Button variant="glass" onClick={() => navigateTo('home')}>
              <ArrowLeft size={16} /> Back to Discover
            </Button>
          </div>
          <AnimeDetailHero anime={selectedAnime} onWatch={() => openFullPlayer()} />
          <EpisodeList
            episodes={selectedAnime.episodesList}
            onPlayEpisode={ep => openFullPlayer(ep)}
          />
          <AnimeMetadataTabs anime={selectedAnime} />
          <ContentRail title="More like this">
            {trendingAnime
              .filter(item => item.id !== selectedAnime.id)
              .map(anime => (
                <AnimeCard anime={anime} key={anime.id} onSelect={openDetail} />
              ))}
          </ContentRail>
        </div>
      )}
    </main>

    <MobileNavigation onNavigate={navigateTo} currentView={currentView} />
    <SearchOverlay open={search} onClose={() => setSearch(false)} />
    <Drawer open={drawer} onClose={() => setDrawer(false)}>
      <h2>Your 7anime space</h2>
      <p>Welcome back, <strong>{previewUser.username}</strong>! Manage your space.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <Button onClick={() => { setDrawer(false); navigateTo('profile') }}>View Profile Space</Button>
        <Button variant="glass" onClick={() => { setDrawer(false); navigateTo('library') }}>My Library ({savedLibrary.length})</Button>
        <Button variant="ghost" onClick={() => setDrawer(false)}>Close Menu</Button>
      </div>
    </Drawer>
  </>
}

export function FoundationPreview() { return <ToastProvider><Home /></ToastProvider> }
