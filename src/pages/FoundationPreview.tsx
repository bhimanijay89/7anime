import { ArrowLeft, Play, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { Anime, Episode } from '../types/domain'
import { AnimeCard } from '../components/anime/AnimeCard'
import { AnimeDetailHero } from '../components/anime/AnimeDetailHero'
import { AnimeMetadataTabs } from '../components/anime/AnimeMetadataTabs'
import { DiscoveryCatalog } from '../components/anime/DiscoveryCatalog'
import { EpisodeList } from '../components/anime/EpisodeList'
import { CinematicCarousel } from '../components/carousel/CinematicCarousel'
import { ContentRail } from '../components/carousel/ContentRail'
import { DesktopNavbar, MobileNavigation, type ViewMode } from '../components/navigation/Navigation'
import { FullPlayerView } from '../components/player/FullPlayerView'
import { LibraryView } from '../components/profile/LibraryView'
import { ProfileFullView } from '../components/profile/ProfileFullView'
import { SearchOverlay } from '../components/search/SearchOverlay'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Overlay'
import { ToastProvider, useToast } from '../components/ui/Toast'
import { continueWatching, previewAnime, previewUser, trendingAnime } from '../data/anime'
import './preview.css'

const slides = [
  { title: 'Neon Ronin', eyebrow: 'TOP 10 · #01 THIS WEEK', description: 'A rogue blade runner crosses a rain-soaked megacity to find the memory that was stolen from her.', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85' },
  { title: 'Ashes of Astra', eyebrow: 'TOP 10 · #02 THIS WEEK', description: 'In the aftermath of a dying star, a crew of young explorers must chart an impossible way home.', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85' },
]

function Home() {
  const [currentView, setCurrentView] = useState<ViewMode>('home')
  const [selectedAnime, setSelectedAnime] = useState<Anime>(previewAnime[0])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | undefined>(undefined)
  const [savedLibrary, setSavedLibrary] = useState<Anime[]>([previewAnime[0], previewAnime[1], previewAnime[2]])
  const [search, setSearch] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const { notify } = useToast()

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
          <CinematicCarousel slides={slides} />
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
          <ContentRail title="Continue watching">
            {continueWatching.map(anime => (
              <AnimeCard anime={anime} variant="continue" key={anime.id} onSelect={openDetail} />
            ))}
          </ContentRail>
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
          <section className="home-feature glass">
            <div>
              <p className="eyebrow">Just announced</p>
              <h2>Fresh worlds are almost here.</h2>
              <p>Keep an eye on the next wave of original stories, seasonal favorites, and films.</p>
              <Button variant="glass" onClick={() => openDetail(previewAnime[3])}>Browse upcoming</Button>
            </div>
            <div className="home-feature__art" aria-hidden="true" />
          </section>
          <ContentRail title="Top rated">
            {[...previewAnime].reverse().map((anime, index) => (
              <AnimeCard anime={anime} variant="ranked" key={`${anime.id}-${index}`} onSelect={openDetail} />
            ))}
          </ContentRail>
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

