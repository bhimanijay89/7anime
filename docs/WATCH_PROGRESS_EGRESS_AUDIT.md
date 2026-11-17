# 7Anime — Watch Progress & Database Egress Optimization Audit

> **Document Version:** 1.0.0  
> **Target Repository:** `E:\7ANIME_CODEX`  
> **Branch:** `main`  
> **Date:** November 17, 2026  
> **Scope:** Comprehensive architectural audit of video player progress synchronization, backend API routes, database query profiles, Supabase egress dynamics, failure scenarios, and proposed event-driven hybrid architecture.

---

## 1. Executive Summary

An in-depth investigation of the 7Anime watch progress subsystem reveals that **playback progress heartbeats are the single largest driver of database query volume and Supabase egress spikes**. 

Under the current implementation:
- The video player fires a progress synchronization request every **15 seconds** during continuous playback.
- Every individual 15-second heartbeat triggers **5 to 7 sequential database queries** across multiple PostgreSQL tables (`watch_progress`, `user_streaks`, `daily_watch_activities`, and `user_stats`).
- For a single user watching a standard 24-minute anime episode (1,440 seconds), the backend executes **480 to 672 database queries**.
- For 100 concurrent active viewers, this generates **24,000 HTTP requests** and **120,000 to 168,000 database operations per hour**, transferring hundreds of megabytes of repetitive metadata and JSON blobs over the Supabase connection pool.
- Additionally, on episode load, the player immediately forces a **0-second save**, creating an unnecessary initial request and risking the overwrite of previously saved resume positions.
- Conversely, on stream exit or unexpected tab closure, progress persistence relies on an asynchronous `fetch()` without `keepalive: true`, leaving users vulnerable to progress loss upon closing tabs.

This audit establishes the baseline metrics, maps all interacting frontend and backend systems, analyzes root causes of egress spikes, identifies critical failure modes, and outlines an **event-driven hybrid architecture** that reduces database operations by **~94%** while improving resume accuracy and stream-exit reliability.

---

## 2. All Relevant Frontend and Backend Files

### Frontend Architecture
| File Path | Role in Watch Progress |
|---|---|
| `src/components/player/FullPlayerView.tsx` | Main cinema player view. Manages `progressRef`, `lastSavedRef`, postMessage listener (`handleMessage`), 15s throttle logic (`saveProgress`), unmount/exit hooks (`pagehide`, cleanup), and UI control deck. |
| `src/components/player/AnimeTVPlusIframe.tsx` | Server 1 & Server 2 sandboxed video iframe (`allow-scripts allow-forms allow-presentation`). |
| `src/components/player/MegaPlayIframe.tsx` | Server 3 & Server 4 un-sandboxed video iframe emitting cross-origin postMessage events (`timeupdate`, `progress`, `pause`, `ended`). |
| `src/pages/FoundationPreview.tsx` | Master view orchestrator. Implements `fetchUserProgress()` on session load, `handleProgressUpdate()` dispatching `POST /api/progress`, optimistic `continueWatchingList` state updates, and `openContinueWatchingPlayer()`. |
| `src/context/AuthContext.tsx` & `src/utils/auth.ts` | Provides session tokens and `getAuthHeaders()` for authenticated progress requests. |
| `src/context/PartyContext.tsx` | Manages real-time watch party synchronization independently from local watch progress. |

### Backend Architecture
| File Path | Role in Watch Progress |
|---|---|
| `backend/src/routes/progress.ts` | Handles `GET /api/progress` (loads top 50 records and hydrates anime details) and `POST /api/progress` (validates, computes delta, upserts record, triggers streak and gamification services). |
| `backend/src/services/streak.ts` | Processes daily streak qualification (`processWatchProgressForStreak`). Queries `user_streaks` and upserts `daily_watch_activities` including `episodesJson`. |
| `backend/src/services/gamification.ts` | Handles user watch time tracking (`recordUserActivity`). Queries `user_stats` and increments `totalWatchSeconds`. |
| `backend/src/middleware/auth.ts` | `requireAuth` middleware. Validates bearer token / session cookie via Redis Tier 1 cache or Supabase `sessions` table Tier 2 fallback. |
| `backend/src/server.ts` | Mounts `progressRouter` at `/api/progress`. |

### Database & Schema
| File Path | Model / Table | Indexes & Constraints |
|---|---|---|
| `backend/prisma/schema.prisma` | `model WatchProgress` (`watch_progress`) | `@@unique([userId, anilistId, episodeNumber])`<br>`@@index([userId])`<br>`@@index([anilistId])` |
| `backend/prisma/schema.prisma` | `model UserStreak` (`user_streaks`) | `@@unique([userId])` |
| `backend/prisma/schema.prisma` | `model DailyWatchActivity` (`daily_watch_activities`) | `@@unique([userId, activityDate])`<br>`@@index([userId])`<br>`@@index([activityDate])` |
| `backend/prisma/schema.prisma` | `model UserStats` (`user_stats`) | `@@unique([userId])` |

---

## 3. Current Progress Synchronization Flow

```
[Iframe Player (MegaPlay)]
      │
      │ postMessage ({ event: 'timeupdate', currentTime: 15.2, duration: 1440 }) [every 250ms–1s]
      ▼
[FullPlayerView.tsx]
      │
      ├─► extractProgressFromMessage() ──► Updates progressRef.current in memory
      │
      └─► saveProgress()
            │
            ├─► Throttle Check: (now - lastSavedRef.savedAt < 15000 && delta < 15s)
            │      └─► If < 15s: Return (do nothing)
            │
            └─► If >= 15s or force (pause/ended/unmount):
                   │
                   ▼
         onProgressUpdate(animeId, episode, progressSeconds, duration, completed)
                   │
                   ▼
[FoundationPreview.tsx]
      │
      ├─► Optimistic UI update: setContinueWatchingList() (in React state)
      │
      └─► fetch('https://sevenanime-vodw.onrender.com/api/progress', { method: 'POST', body: ... })
                   │
                   ▼
[Backend: POST /api/progress]
      │
      ├─► 1. requireAuth (Checks Redis tokenHash or SELECT sessions)
      ├─► 2. prisma.watchProgress.findUnique (SELECT previous progressSeconds)
      ├─► 3. prisma.watchProgress.upsert (INSERT ... ON CONFLICT DO UPDATE)
      ├─► 4. processWatchProgressForStreak()
      │        ├─► SELECT user_streaks (getOrCreateUserStreak)
      │        ├─► SELECT daily_watch_activities (today's record)
      │        └─► UPSERT daily_watch_activities (writes large episodesJson)
      └─► 5. recordUserActivity()
               ├─► SELECT user_stats (getOrCreateUserStats)
               └─► UPDATE user_stats (increments totalWatchSeconds)
```

### Initial Load Flaw
When a user opens an episode:
1. `FullPlayerView` mounts and initializes `progressRef.current.progressSeconds = 0`.
2. Inside `useEffect`, line 737 immediately calls:
   ```ts
   saveProgress(currentEpisode.number, 0, progressRef.current.durationSeconds, false, true) // force = true
   ```
3. This fires `POST /api/progress` with `progressSeconds: 0`.
4. If the user previously watched 15 minutes of this episode and is returning to resume, the backend immediately overwrites `progressSeconds` to 0 before the video even buffers or retrieves its previous position.
5. Furthermore, there is **no single-episode fetch endpoint** (`GET /api/progress/:anilistId/:episodeNumber`) to restore the exact timestamp.

### Exit Flaw
When a user closes the tab or navigates away:
1. `saveCurrentProgress()` is bound to `window.pagehide` and the `useEffect` cleanup.
2. It executes a standard `fetch()` call.
3. Standard fetch requests triggered during `pagehide` or `beforeunload` are routinely cancelled by modern browser engines (Chromium, WebKit, Gecko) when the document context terminates.
4. Without `fetch(..., { keepalive: true })` or `navigator.sendBeacon()`, end-of-session progress updates fail silently upon tab closure.

---

## 4. Current Request Frequency & Database Queries

### Per Playback Session (Standard 24-minute Episode)
- **Playback Duration:** 1,440 seconds (24 minutes).
- **Heartbeat Interval:** 15 seconds.
- **Total Heartbeats:** 1,440 / 15 = **96 HTTP requests per episode**.
- **Initial Mount & Exit Requests:** +2 requests (0s mount save + exit save).
- **Total API Requests per Episode:** **~98 requests**.

### Database Operations Executed Per Heartbeat
| Step | Operation | Target Table | Description |
|---|---|---|---|
| 1 | `SELECT` | `sessions` (if Redis miss) | Auth session lookup (cached in Redis, DB fallback). |
| 2 | `SELECT` | `watch_progress` | Fetches `existingEntry` to compute `deltaSeconds`. |
| 3 | `UPSERT` | `watch_progress` | Updates `progressSeconds`, `durationSeconds`, `completed`. |
| 4 | `SELECT` | `user_streaks` | Fetches user streak and timezone. |
| 5 | `SELECT` | `daily_watch_activities` | Fetches today's watch activity record. |
| 6 | `UPSERT` | `daily_watch_activities` | Updates `qualifyingWatchSeconds` and serializes `episodesJson`. |
| 7 | `SELECT` | `user_stats` | Fetches current user gamification stats. |
| 8 | `UPDATE` | `user_stats` | Increments `totalWatchSeconds`. |

**Total Database Queries per Heartbeat:** **6 to 8 SQL statements** (average: **7 queries**).

### Query Volume Scale
| Scale Scenario | API Requests | Total Database Queries | Estimated Egress |
|---|---|---|---|
| **1 Episode (24 min, 1 user)** | 98 | **672 queries** | ~2.5 MB |
| **1 Hour (1 user continuous)** | 240 | **1,680 queries** | ~6.2 MB |
| **1 Evening (3 hours, 1 user)** | 720 | **5,040 queries** | ~18.6 MB |
| **50 Concurrent Users (1 hour)** | 12,000 | **84,000 queries** | ~310 MB |
| **100 Concurrent Users (1 hour)** | 24,000 | **168,000 queries** | ~620 MB |
| **100 Concurrent Users (3 hours)** | 72,000 | **504,000 queries** | **~1.86 GB** |

---

## 5. Why Supabase Egress is Increasing

The root causes of the Supabase egress spikes (approaching and exceeding the 5 GB free tier quota) are:

1. **Repetitive Short-Interval Polling:**
   A 15-second heartbeat is overly aggressive for an application where video playback positions change continuously and smoothly. Sending network packets every 15 seconds produces thousands of redundant round-trips for unchanged episode metadata.
2. **Heavy Multi-Table Cascades on Every Write:**
   The backend treats every progress heartbeat as an opportunity to recalculate streaks, update gamification stats, and read/write the full daily JSON activity record (`episodesJson`). Each write cascades into 6–8 queries instead of a single lightweight atomic update.
3. **Large JSON Columns in Daily Activity:**
   `daily_watch_activities.episodesJson` contains a dictionary of all episodes watched on that day. On every 15-second heartbeat, this entire JSON object is selected from PostgreSQL over TLS, parsed by Prisma, updated, and transmitted back to PostgreSQL in an `UPDATE` statement. As a user watches more episodes during the day, the egress payload of this query increases linearly.
4. **Seeking Bypasses Throttle:**
   In `FullPlayerView.tsx`, the throttle condition checks:
   `Math.abs(clampedProgress - last.progressSeconds) < 15`
   If a user scrubs or seeks forward/backward by 15+ seconds, it immediately bypasses the throttle and sends a request. Rapid seeking generates a spike of back-to-back database writes.
5. **Lack of Single-Record Progress Endpoint:**
   Because there is no targeted `GET /api/progress/:anilistId/:episodeNumber` endpoint, fetching watch progress requires `GET /api/progress`, which retrieves 50 records and hydrates all of them via AniList API.

---

## 6. Existing Failure Scenarios

1. **Tab Close & Unload Progress Loss:**
   When a user closes their browser tab or navigates directly to another site, `saveCurrentProgress` executes an asynchronous `fetch()` in the `pagehide` handler. Without `keepalive: true` or `sendBeacon`, the browser terminates the TCP connection before the request reaches Render, discarding the user's progress.
2. **Initial 0-Second Overwrite:**
   Opening an episode forces an immediate save of `0` seconds. If network latency delays the video iframe's initial `postMessage`, or if the user leaves the page immediately after clicking, their prior progress is wiped and reset to 0 in the database.
3. **Server 1 / Server 2 (AnimeTVPlus) Progress Blindspot:**
   AnimeTVPlus is isolated with `sandbox="allow-scripts allow-forms allow-presentation"`. If postMessages are blocked or omitted by the provider, the progress timer never advances, leaving progress stuck at 0s unless client-side fallback estimation or local session tracking is active.
4. **Offline / Intermittent Disconnection:**
   If a user experiences transient network disconnection while playing from buffered video, every subsequent heartbeat fails with `TypeError: Failed to fetch`. There is no local queue or `localStorage` buffer to persist and reconcile progress once connectivity is restored.
5. **Party Play Crosstalk Protection:**
   If a host in Watch Party seeks or switches episodes, the player must never persist another user's room state as the local user's own watch progress without explicit playback event verification.

---

## 7. Recommended Optimized Architecture (Phase 2 Roadmap)

The recommended architecture transitions from an aggressive periodic heartbeat to an **Event-Driven Hybrid Architecture**:

```
[Video Playback Events]
   │
   ├─► timeupdate ────────► In-Memory Local Tracking (progressRef)
   │                        Zero network requests. Zero React re-renders.
   │
   ├─► seeking ───────────► Local tracking only (debounced; no instant network requests)
   │
   ├─► pause ─────────────► Immediate Debounced Save (user paused to take a break)
   │
   ├─► ended / completion ─► Immediate Guaranteed Save (marks episode 100% completed)
   │
   ├─► Safety Checkpoint ──► Configurable periodic timer (60s – 90s, default: 75s)
   │                        Saves only if playback has advanced >= 30s.
   │                        Deduplicates in-flight saves.
   │
   └─► Stream Exit ────────► Guaranteed Exit Save:
                            - Route navigation: standard authenticated fetch()
                            - Tab close / pagehide / visibilitychange:
                              fetch(url, { method: 'POST', keepalive: true, ... })
                              with fallback to navigator.sendBeacon()
```

### Detailed Architectural Specifications:

#### A. Initial Progress Fetch & Resume
- Add a lightweight backend endpoint: `GET /api/progress/:anilistId` (or `GET /api/progress/:anilistId/:episodeNumber`).
- When the player mounts:
  - Fetch existing progress **once** for that anime/episode.
  - Initialize local `progressRef.current.progressSeconds` to the saved position.
  - **ELIMINATE the immediate 0-second save.** Never send a write request on mount.

#### B. Client-Side Event-Driven Progress Tracking
- Maintain active playback time strictly in `useRef` (`progressRef.current`).
- Rapid `timeupdate` and `seeking` events from iframes only update the ref.
- Never trigger React state updates or network calls on raw time updates.

#### C. Periodic Safety Checkpoint (Configurable 60–90 Seconds)
- Replace the 15-second heartbeat with a configurable safety interval (default: **75 seconds**).
- A save is only dispatched if:
  1. The video is actively playing.
  2. The playback position has advanced by at least **30 seconds** since the last save.
  3. No other save request is currently in flight.
- Reset the safety checkpoint timer upon any forced/event-driven save (e.g., pause).

#### D. Guaranteed Save on Stream Exit
- Catch all exit vectors:
  - Episode switch in player (Next, Prev, Dropdown)
  - Back button navigation (`onBack`)
  - Route navigation
  - Browser tab closure / window close (`pagehide`, `visibilitychange` where `document.visibilityState === 'hidden'`)
- Use `fetch(url, { method: 'POST', keepalive: true, body: ..., headers: ... })` which guarantees modern browser completion even after the document unloads.
- Provide graceful fallback to `navigator.sendBeacon()` with `application/json` or Blob format.

#### E. Offline & Network Failure Recovery
- If a progress save fails due to network outage, cache the pending progress in `localStorage` (`7anime_pending_progress`).
- When `window.addEventListener('online')` fires or on the next successful page interaction, flush and synchronize pending items.
- Ensure stale pending progress (older timestamp) never overwrites newer database progress.

#### F. Backend Query Optimization
- In `POST /api/progress`:
  - Consolidate streak and gamification updates so they do not execute 5-7 queries on every single progress save.
  - For heartbeats where `deltaSeconds` is minor, execute only the atomic `prisma.watchProgress.upsert`.
  - Batch or throttle `daily_watch_activities` and `user_stats` updates to milestone intervals (e.g., when an episode completes or upon session exit) rather than every intermediate checkpoint.
  - Add composite index on `(userId, updatedAt DESC)` in database documentation recommendations.

---

## 8. Estimated Request & Query Reduction

### Baseline Assumptions:
- Standard anime episode: 24 minutes (1,440 seconds).
- Viewer watches continuously with 1 pause at minute 12, then finishes the episode.
- Safety checkpoint interval set to **75 seconds** (requiring >= 30s delta).

### Comparison Matrix

| Metric | Current Implementation (15s Heartbeat) | Proposed Event-Driven Hybrid (75s Checkpoint + Exit) | Reduction |
|---|---|---|---|
| **Mount Requests** | 1 (Immediate 0s save) | **0** (Fetch only, zero writes) | **-100%** |
| **Intermediate Heartbeats** | 96 (every 15s) | **18** (every 75s while playing) | **-81.2%** |
| **Event Saves (Pause / Ended / Exit)** | 2 (Pause + Ended) | **2** (Pause + Ended) | **0%** |
| **Total API Requests per Episode** | **99 requests** | **20 requests** | **-79.8% (~80% reduction)** |
| **Database Queries per Request** | 7 queries (cascading) | 2 queries (optimized upsert) | **-71.4%** |
| **Total Queries per 24-min Episode** | **693 queries** | **40 queries** | **-94.2% (~94% reduction)** |
| **Queries per Hour (Continuous Play)** | **1,680 queries** | **100 queries** | **-94.0%** |
| **Queries per 100 Concurrent Users / Hr** | **168,000 queries** | **10,000 queries** | **-94.0%** |
| **Est. Supabase Egress per 100 Users / Hr** | **~620 MB** | **~35 MB** | **-94.3%** |
| **Progress Loss Risk on Tab Close** | **HIGH** (Plain fetch in pagehide) | **NEGLIGIBLE** (`keepalive: true` + offline queue) | **Major Improvement** |
| **Risk of 0s Resume Overwrite** | **HIGH** (Forces 0s on mount) | **ZERO** (Initial fetch restores position) | **Fixed** |

---

## 9. Conclusion & Next Steps

The existing 15-second heartbeat is the primary contributor to excessive Supabase database query volume and egress consumption. Implementing the **Event-Driven Hybrid Architecture** will:
1. **Reduce database queries by ~94%**, preserving Supabase free-tier egress limits comfortably.
2. **Eliminate the 0-second overwrite bug**, ensuring users never lose their saved episode position upon re-entering.
3. **Guarantee exit-save persistence**, using `fetch(..., { keepalive: true })` and offline `localStorage` recovery.
4. **Maintain 100% compatibility** with Watch Streaks, Continue Watching, Watch Parties, and all 4 video servers.

> **Stop Point:** Phase 1 Architectural Audit complete. Awaiting user review and authorization before proceeding to Phase 2 implementation.
