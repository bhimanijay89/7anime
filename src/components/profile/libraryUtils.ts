import type { Anime } from '../../types/domain'

export type LibraryCategory = 'watching' | 'planned' | 'completed'
export type LibraryCategoryTab = 'all' | LibraryCategory
export type LibrarySortOption = 'recent' | 'rating' | 'title' | 'episodes'
export type LibrarySyncStatus = 'guest' | 'synced' | 'syncing' | 'error'

export interface LibraryStatusBadge {
  tone: 'completed' | 'watching' | 'planned'
  label: string
  iconType: 'completed' | 'airing' | 'watching' | 'planned'
}

/**
 * Shared category-classification helper ensuring every anime maps
 * to exactly one category with consistent precedence:
 * 1. Explicit user watch progress:
 *    - progress >= 100 -> 'completed'
 *    - 0 < progress < 100 -> 'watching'
 *    - progress === 0 -> 'planned'
 * 2. Explicit user library status (from backend LibraryEntry or user selection):
 *    - libraryStatus === 'completed' -> 'completed'
 *    - libraryStatus === 'watching' -> 'watching'
 *    - libraryStatus === 'planned' -> 'planned'
 * 3. Fallback for untracked saved anime:
 *    - Defaults to 'planned' (Plan to Watch).
 *    (Untracked anime are NOT automatically marked Watching based on broadcast Airing status).
 */
export function getAnimeLibraryCategory(anime: Anime): LibraryCategory {
  const rawP = anime.progress
  const hasValidProgress =
    typeof rawP === 'number' && !Number.isNaN(rawP) && Number.isFinite(rawP)

  // 1. Highest precedence: explicit valid user watch progress
  if (hasValidProgress) {
    if (rawP >= 100) return 'completed'
    if (rawP > 0) return 'watching'
    return 'planned'
  }

  // 2. Explicit user library status
  if (anime.libraryStatus) {
    if (anime.libraryStatus === 'completed') return 'completed'
    if (anime.libraryStatus === 'watching') return 'watching'
    if (anime.libraryStatus === 'planned') return 'planned'
  }

  // 3. Fallback for untracked anime:
  // An untracked saved title belongs in Plan to Watch
  return 'planned'
}

/**
 * Returns badge tone, display label, and icon type for LibraryCard,
 * strictly aligned with getAnimeLibraryCategory precedence:
 * - Completed: tone 'completed', label 'Completed'
 * - Watching: tone 'watching', label 'Watching'
 * - Planned: tone 'planned', label 'Plan to Watch' (or 'Upcoming' if unreleased)
 */
export function getAnimeLibraryStatusBadge(anime: Anime): LibraryStatusBadge {
  const category = getAnimeLibraryCategory(anime)

  if (category === 'completed') {
    return {
      tone: 'completed',
      label: 'Completed',
      iconType: 'completed',
    }
  }

  if (category === 'watching') {
    return {
      tone: 'watching',
      label: 'Watching',
      iconType: anime.status === 'Airing' ? 'airing' : 'watching',
    }
  }

  // category === 'planned'
  return {
    tone: 'planned',
    label: anime.status === 'Upcoming' ? 'Upcoming' : 'Plan to Watch',
    iconType: 'planned',
  }
}

