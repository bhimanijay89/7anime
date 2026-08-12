import { Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Anime } from '../../types/domain'
import { EmptyState } from '../ui/Feedback'
import { Button } from '../ui/Button'
import { AnimeCard } from './AnimeCard'
import './discovery.css'

const genres = ['All', 'Action', 'Fantasy', 'Romance', 'Drama']
const statuses = ['All', 'Airing', 'Completed', 'Upcoming'] as const
export function DiscoveryCatalog({ anime }: { anime: Anime[] }) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All')
  const [status, setStatus] = useState<(typeof statuses)[number]>('All')
  const results = useMemo(() => anime.filter(item => (item.title.toLowerCase().includes(query.toLowerCase())) && (genre === 'All' || item.genres?.includes(genre)) && (status === 'All' || item.status === status)), [anime, genre, query, status])
  return <section className="discovery" id="anime" aria-labelledby="discover-title">
    <header className="discovery__heading"><div><p className="eyebrow">Explore the catalog</p><h1 id="discover-title">Find your next world.</h1><p>Browse curated static titles by mood, genre, format, or status.</p></div></header>
    <div className="discovery__tools glass"><label><Search size={18} /><span className="sr-only">Search titles</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles" /></label><div className="discovery__select"><SlidersHorizontal size={16} /><select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value as typeof status)}>{statuses.map(option => <option key={option}>{option}</option>)}</select></div></div>
    <div className="discovery__genres" aria-label="Filter by genre">{genres.map(option => <button className={genre === option ? 'active' : ''} onClick={() => setGenre(option)} aria-pressed={genre === option} key={option}>{option}</button>)}</div>
    <div className="discovery__results"><span>{results.length} {results.length === 1 ? 'title' : 'titles'} found</span><Button variant="ghost" onClick={() => { setQuery(''); setGenre('All'); setStatus('All') }}>Reset filters</Button></div>
    {results.length ? <div className="discovery__grid">{results.map(item => <AnimeCard anime={item} key={item.id} />)}</div> : <EmptyState title="No titles match that search" description="Try another title, genre, or release status." action={<Button onClick={() => { setQuery(''); setGenre('All'); setStatus('All') }}>Clear filters</Button>} />}
  </section>
}
