import type { Anime, User } from '../types/domain'
export const previewAnime: Anime[] = [
  {
    id: '1',
    title: 'Neon Ronin',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85',
    episode: 'EP 12',
    status: 'Airing',
    rating: 8.8,
    sub: 12,
    dub: 8,
    progress: 67,
    genres: ['Action', 'Sci-Fi', 'Cyberpunk'],
    type: 'TV',
    year: 2026,
    studio: 'Mappa Cyber Arts',
    source: 'Original',
    duration: '24m per ep',
    synopsis: 'In Neo-Kyoto 2099, a rouge cybernetically enhanced ronin discovers a conspiracy connecting her stolen memory core to the city sovereign AI core. Joined by a black-market hacker and an exiled street samurai, she must slice through rain-slick neon alleyways before the city purges her consciousness.',
    episodesList: [
      { id: 'e1', number: 1, title: 'Rain & Chrome', duration: 24, watched: true, thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80' },
      { id: 'e2', number: 2, title: 'Ghosts in the Signal', duration: 23, watched: true, thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80' },
      { id: 'e3', number: 3, title: 'Katanas at Midnight', duration: 24, watched: true, thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' },
      { id: 'e4', number: 4, title: 'Sub-Level Protocol', duration: 24, watched: false, thumbnail: 'https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=400&q=80' },
      { id: 'e5', number: 5, title: 'Overdrive Heartbeat', duration: 25, watched: false, thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' }
    ],
    characters: [
      { id: 'c1', name: 'Kira Vance', role: 'Main', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', voiceActor: { name: 'Rie Takahashi', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' } },
      { id: 'c2', name: 'Renji Sudo', role: 'Main', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', voiceActor: { name: 'Mamoru Miyano', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' } }
    ]
  },
  {
    id: '2',
    title: 'Ashes of Astra',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85',
    episode: 'EP 24',
    status: 'Completed',
    rating: 9.1,
    sub: 24,
    dub: 24,
    genres: ['Fantasy', 'Drama', 'Adventure'],
    type: 'TV',
    year: 2025,
    studio: 'Ufotable Sky',
    source: 'Manga',
    duration: '23m per ep',
    synopsis: 'When a catastrophic stellar event shattered the celestial sphere, the remains of celestial Astra rained down upon mortals as embers of elemental magic. A young star-weaver must gather five fallen embers before the Void Empress consumes the remaining sun.',
    episodesList: [
      { id: 'e201', number: 1, title: 'The Starfall Festival', duration: 24, watched: true, thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' },
      { id: 'e202', number: 2, title: 'Embers of the East', duration: 23, watched: true, thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80' }
    ],
    characters: [
      { id: 'c201', name: 'Astraea', role: 'Main', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', voiceActor: { name: 'Aoi Yuuki', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' } }
    ]
  },
  { id: '3', title: 'Skyline Requiem', poster: 'https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=600&q=80', episode: 'EP 8', status: 'Airing', rating: 8.4, sub: 8, dub: 6, genres: ['Romance', 'Drama'], type: 'TV', year: 2026, studio: 'CloverWorks', synopsis: 'Two musicians meet on a rooftop overlooking a foggy coastal metropolis. As their melodies align, secret burdens come to light.' },
  { id: '4', title: 'The Ninth Bloom', poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', episode: 'Soon', status: 'Upcoming', rating: 8.2, genres: ['Fantasy'], type: 'Movie', year: 2026, studio: 'Studio Ghibli Core', synopsis: 'A mythical garden blooms once every century, granting a single wish to whoever finds its hidden gate.' }
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
export const previewAchievements = [
  { id: 'a1', title: 'First Episode', description: 'Watched your first complete episode on 7anime', unlocked: true },
  { id: 'a2', title: 'Cyberpunk Fanatic', description: 'Finished 5 sci-fi or cyberpunk series', unlocked: true },
  { id: 'a3', title: '10-Day Streak', description: 'Logged in and watched anime 10 days in a row', unlocked: true },
  { id: 'a4', title: 'Night Owl', description: 'Watched anime between 2 AM and 5 AM', unlocked: true },
  { id: 'a5', title: 'Master Collector', description: 'Saved 25 anime series to your personal library', unlocked: false },
]

