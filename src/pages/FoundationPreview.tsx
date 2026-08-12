import { Play, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { AnimeCard } from '../components/anime/AnimeCard'
import { DiscoveryCatalog } from '../components/anime/DiscoveryCatalog'
import { CinematicCarousel } from '../components/carousel/CinematicCarousel'
import { ContentRail } from '../components/carousel/ContentRail'
import { DesktopNavbar, MobileNavigation } from '../components/navigation/Navigation'
import { SearchOverlay } from '../components/search/SearchOverlay'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Overlay'
import { ToastProvider, useToast } from '../components/ui/Toast'
import { continueWatching, previewAnime, trendingAnime } from '../data/anime'
import './preview.css'

const slides = [
  { title: 'Neon Ronin', eyebrow: 'TOP 10 · #01 THIS WEEK', description: 'A rogue blade runner crosses a rain-soaked megacity to find the memory that was stolen from her.', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85' },
  { title: 'Ashes of Astra', eyebrow: 'TOP 10 · #02 THIS WEEK', description: 'In the aftermath of a dying star, a crew of young explorers must chart an impossible way home.', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85' },
]

function Home() {
  const [search, setSearch] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const { notify } = useToast()
  return <>
    <DesktopNavbar onSearch={() => setSearch(true)} onMenu={() => setDrawer(true)} />
    <main id="top" className="home">
      <CinematicCarousel slides={slides} />
      <section className="home-quick glass" aria-label="Quick discovery"><span><Sparkles size={17} />Curated for your evening</span><div><Button onClick={() => notify('Your watchlist is ready when you are.', 'info')}>Start watching <Play size={15} fill="currentColor" /></Button><Button variant="ghost" onClick={() => notify('Login will be available in a future phase.', 'info')}><Plus size={16} /> My list</Button></div></section>
      <ContentRail title="Continue watching">{continueWatching.map(anime => <AnimeCard anime={anime} variant="continue" key={anime.id} />)}</ContentRail>
      <section className="home-section-head"><div><p className="eyebrow">Handpicked today</p><h2>Trending now</h2></div><p>Stories finding their audience right now.</p></section>
      <ContentRail title="Popular with 7anime viewers">{trendingAnime.map(anime => <AnimeCard anime={anime} key={anime.id} />)}</ContentRail>
      <section className="home-feature glass"><div><p className="eyebrow">Just announced</p><h2>Fresh worlds are almost here.</h2><p>Keep an eye on the next wave of original stories, seasonal favorites, and films.</p><Button variant="glass">Browse upcoming</Button></div><div className="home-feature__art" aria-hidden="true" /></section>
      <ContentRail title="Top rated">{[...previewAnime].reverse().map((anime, index) => <AnimeCard anime={anime} variant="ranked" key={`${anime.id}-${index}`} />)}</ContentRail>
      <DiscoveryCatalog anime={trendingAnime} />
    </main>
    <MobileNavigation />
    <SearchOverlay open={search} onClose={() => setSearch(false)} />
    <Drawer open={drawer} onClose={() => setDrawer(false)}><h2>Your 7anime space</h2><p>Sign-in and personal library features arrive in a future phase.</p><Button onClick={() => setDrawer(false)}>Keep discovering</Button></Drawer>
  </>
}
export function FoundationPreview() { return <ToastProvider><Home /></ToastProvider> }
