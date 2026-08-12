export interface Anime { id: string; title: string; poster: string; cover?: string; episode?: string; status: 'Airing' | 'Completed' | 'Upcoming'; rating?: number; sub?: number; dub?: number; progress?: number; genres?: string[]; type?: 'TV' | 'Movie'; year?: number }
export interface Episode { id: string; number: number; title: string; duration?: number; watched?: boolean }
export interface Season { id: string; title: string; year: number; episodes: Episode[] }
export interface WatchProgress { animeId: string; episodeId: string; percentage: number; updatedAt: string }
export interface LibraryItem { animeId: string; state: 'watching' | 'planned' | 'completed'; savedAt: string }
export interface ScheduleItem { id: string; animeId: string; weekday: string; episode: number; airTime: string }
export interface Achievement { id: string; title: string; description: string; unlocked: boolean }
export interface UserLevel { level: number; title: string; currentXp: number; nextLevelXp: number }
export interface Streak { days: number; longestDays: number }
export interface Rank { title: string; position: number; percentile?: number }
export interface User { id: string; username: string; avatar?: string; level: UserLevel; streak: Streak; coins: number }
export interface ShareData { title: string; url: string; description?: string }
