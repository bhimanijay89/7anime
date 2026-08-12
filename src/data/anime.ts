import type { Anime, User } from '../types/domain'
export const previewAnime: Anime[] = [
  { id: '1', title: 'Neon Ronin', poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80', episode: 'EP 12', status: 'Airing', rating: 8.8, sub: 12, dub: 8, progress: 67, genres: ['Action', 'Sci-Fi'], type: 'TV', year: 2026 },
  { id: '2', title: 'Ashes of Astra', poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', episode: 'EP 24', status: 'Completed', rating: 9.1, sub: 24, dub: 24, genres: ['Fantasy', 'Drama'], type: 'TV', year: 2025 },
  { id: '3', title: 'Skyline Requiem', poster: 'https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=600&q=80', episode: 'EP 8', status: 'Airing', rating: 8.4, sub: 8, dub: 6, genres: ['Romance', 'Drama'], type: 'TV', year: 2026 },
  { id: '4', title: 'The Ninth Bloom', poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', episode: 'Soon', status: 'Upcoming', rating: 8.2, genres: ['Fantasy'], type: 'Movie', year: 2026 }
]
export const trendingAnime: Anime[] = [
  ...previewAnime,
  { id: '5', title: 'Moonlit Circuit', poster: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=600&q=80', episode: 'EP 6', status: 'Airing', rating: 8.7, sub: 6, dub: 4 },
  { id: '6', title: 'Velvet Horizon', poster: 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=600&q=80', episode: 'EP 13', status: 'Completed', rating: 8.9, sub: 13, dub: 13 },
]
export const continueWatching: Anime[] = [
  previewAnime[0],
  { ...previewAnime[2], progress: 42 },
  { ...previewAnime[1], progress: 16 },
]
export const previewUser: User = { id: 'u1', username: 'Yuki', level: { level: 27, title: 'Hardcore Otaku', currentXp: 18420, nextLevelXp: 24000 }, streak: { days: 12, longestDays: 19 }, coins: 740 }
