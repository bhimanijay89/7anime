import { BACKEND_URL } from './anilist';

export type FlameState = 'inactive' | 'small' | 'growing' | 'bright' | 'roaring' | 'master';

export interface StreakMilestone {
  days: number;
  title: string;
  description: string;
  icon: string;
  rewardCoins: number;
  rewardXp: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface NextMilestoneInfo {
  days: number;
  title: string;
  description: string;
  progressPct: number;
  remainingDays: number;
}

export interface UserStreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  lastQualifiedDate: string | null;
  timezone: string;
  todayDate: string;
  isActiveToday: boolean;
  flameState: FlameState;
  motivationalMessage: string;
  nextMilestone: NextMilestoneInfo | null;
  milestones: StreakMilestone[];
}

export interface DailyActivityItem {
  activityDate: string;
  qualified: boolean;
  qualifyingWatchSeconds: number;
  completedEpisodes: number;
  episodesJson?: Record<string, {
    anilistId?: number;
    episodeNumber?: number;
    animeTitle?: string;
    progressSeconds: number;
    durationSeconds: number;
    completed: boolean;
  }> | null;
}

export interface DailyActivityResponse {
  timezone: string;
  todayDate: string;
  startDate: string;
  endDate: string;
  activities: DailyActivityItem[];
}

function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('7anime_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        headers['x-timezone'] = tz;
      }
    } catch {
      // ignore
    }
  }
  return headers;
}

/**
 * Fetch the authenticated user's watch streak summary
 */
export async function fetchUserStreak(): Promise<UserStreakSummary | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/streak`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.ok && data.data) {
      return data.data as UserStreakSummary;
    }
    if (data.success && data.streak) {
      return data.streak as UserStreakSummary;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch user streak:', err);
    return null;
  }
}

export interface FetchStreakActivityOptions {
  daysCount?: number;
  month?: string; // Format: YYYY-MM
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch calendar activity history for the user.
 * Supports days count, specific month (YYYY-MM), or custom date range.
 */
export async function fetchStreakActivity(
  optionsOrDays: number | FetchStreakActivityOptions = 35
): Promise<DailyActivityResponse | null> {
  try {
    let query = '';
    if (typeof optionsOrDays === 'number') {
      query = `days=${optionsOrDays}`;
    } else if (optionsOrDays && typeof optionsOrDays === 'object') {
      const params = new URLSearchParams();
      if (optionsOrDays.month) params.set('month', optionsOrDays.month);
      if (optionsOrDays.startDate) params.set('startDate', optionsOrDays.startDate);
      if (optionsOrDays.endDate) params.set('endDate', optionsOrDays.endDate);
      if (optionsOrDays.daysCount && !optionsOrDays.month && !optionsOrDays.startDate) {
        params.set('days', String(optionsOrDays.daysCount));
      }
      query = params.toString();
    }

    const url = `${BACKEND_URL}/api/streak/activity${query ? `?${query}` : ''}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const payload = data.data || data;
    if (payload && (data.ok || data.success)) {
      return {
        timezone: payload.timezone,
        todayDate: payload.todayDate,
        startDate: payload.startDate,
        endDate: payload.endDate,
        activities: payload.activities || [],
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch streak activity:', err);
    return null;
  }
}

/**
 * Sync user timezone to backend
 */
export async function syncUserTimezone(timezone?: string): Promise<boolean> {
  try {
    const tz = timezone || (typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
    const res = await fetch(`${BACKEND_URL}/api/streak/timezone`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ timezone: tz }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Development / testing ping to verify watch progress streak qualification
 */
export async function pingStreakWatch(data: {
  episodeDurationSec?: number;
  watchProgressPercent?: number;
  deltaSeconds?: number;
}): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/streak/ping`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to ping streak:', err);
    return null;
  }
}
