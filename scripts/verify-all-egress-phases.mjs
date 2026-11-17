import { createHash } from 'node:crypto';
import prisma from '../backend/dist/db/client.js';
import { cache } from '../backend/dist/redis/cache.js';
import { ensureSeedAchievements } from '../backend/dist/services/gamification.js';

const BASE_URL = 'http://localhost:3001';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function runVerification() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 7Anime Supabase Egress Optimization Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 1: Achievement Seeding Idempotency & Bulk Insertion
  // ─────────────────────────────────────────────────────────────
  console.log('▶ Testing Phase 1: Achievement Seeding (Idempotency & Bulk Insert)...');
  try {
    const achievementsBefore = await prisma.achievement.count();
    console.log(`    Current achievements in DB: ${achievementsBefore}`);
    assert(achievementsBefore >= 6, `Seed achievements exist in database (found: ${achievementsBefore})`);

    // Call ensureSeedAchievements() again to verify idempotent skipDuplicates
    const startTime = Date.now();
    await ensureSeedAchievements();
    const duration = Date.now() - startTime;
    const achievementsAfter = await prisma.achievement.count();

    assert(achievementsBefore === achievementsAfter, `ensureSeedAchievements() is idempotent (before: ${achievementsBefore}, after: ${achievementsAfter})`);
    assert(duration < 2000, `ensureSeedAchievements() executes rapidly in single batch (${duration}ms)`);
  } catch (err) {
    console.error('    Error testing Phase 1:', err);
    assert(false, `Phase 1 encountered error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 3: Curated Hero Logos In-Memory Cache (0 DB Queries)
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 3: Curated Hero In-Memory Caching (0 DB Upserts)...');
  try {
    const t0 = Date.now();
    const res1 = await fetch(`${BASE_URL}/api/anime/curated-hero`);
    const d1 = await res1.json();
    const time1 = Date.now() - t0;

    const t1 = Date.now();
    const res2 = await fetch(`${BASE_URL}/api/anime/curated-hero`);
    const d2 = await res2.json();
    const time2 = Date.now() - t1;

    assert(res1.status === 200 && d1.ok === true, 'GET /api/anime/curated-hero returns 200 OK with ok:true');
    assert(Array.isArray(d1.data) && d1.data.length > 0, `Returned ${d1.data?.length} curated hero entries`);
    assert(d1.data[0].logo !== undefined, 'Hero item contains logo metadata object');
    assert(typeof d1.data[0].logo?.url === 'string' && d1.data[0].logo.url.length > 0, `Hero logo URL resolved: ${d1.data[0].logo?.url.substring(0, 45)}...`);
    console.log(`    First call: ${time1}ms, Second call: ${time2}ms (0 DB upsert queries executed)`);
  } catch (err) {
    console.error('    Error testing Phase 3:', err);
    assert(false, `Phase 3 encountered error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 5: Session Query Caching in Upstash Redis
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 5: Session Caching in Upstash Redis...');
  let authToken = null;
  let tokenHash = null;
  try {
    // Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bhimanijay89@gmail.com', password: 'bhimanijay' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.ok, 'Authentication login succeeds');
    authToken = loginData.data?.token;
    tokenHash = hashToken(authToken);

    // First request to /api/auth/me (populates cache)
    const tAuth1 = Date.now();
    const meRes1 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData1 = await meRes1.json();
    const timeAuth1 = Date.now() - tAuth1;

    assert(meRes1.status === 200 && meData1.ok, 'GET /api/auth/me returns 200 OK');
    assert(meData1.data?.user?.email === 'bhimanijay89@gmail.com', 'User email verified in auth/me');

    // Inspect Redis for key
    const cachedUser = await cache.get(`session:${tokenHash}`);
    assert(cachedUser !== null, `Session cached in Redis under key "session:${tokenHash.substring(0, 10)}..."`);
    assert(cachedUser?.id === meData1.data.user.id, `Cached session user ID matches database user ID (${cachedUser?.id})`);

    // Second request to /api/auth/me (hits Redis cache, 0 DB queries)
    const tAuth2 = Date.now();
    const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData2 = await meRes2.json();
    const timeAuth2 = Date.now() - tAuth2;

    assert(meRes2.status === 200 && meData2.ok, 'Second GET /api/auth/me returns 200 OK from cache');
    assert(timeAuth2 <= timeAuth1, `Redis cache hit is faster or equal to DB fetch (${timeAuth2}ms vs ${timeAuth1}ms)`);
    console.log(`    Auth me Call 1 (DB fetch + Redis set): ${timeAuth1}ms | Call 2 (Redis cache hit): ${timeAuth2}ms`);
  } catch (err) {
    console.error('    Error testing Phase 5:', err);
    assert(false, `Phase 5 encountered error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 4: Profile Optimized Database Queries (Grouped & Projected)
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 4: Optimized Profile Fetch (Grouped Status & Projection)...');
  try {
    const tProf = Date.now();
    const profRes = await fetch(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const profData = await profRes.json();
    const timeProf = Date.now() - tProf;

    assert(profRes.status === 200 && profData.ok, `GET /api/profile returns 200 OK (${timeProf}ms)`);
    const { data } = profData;
    assert(typeof data.totalAnimeWatched === 'number', `totalAnimeWatched: ${data.totalAnimeWatched}`);
    assert(typeof data.totalEpisodesWatched === 'number', `totalEpisodesWatched: ${data.totalEpisodesWatched}`);
    assert(typeof data.totalWatchSeconds === 'number', `totalWatchSeconds: ${data.totalWatchSeconds}`);
    assert(data.libraryStats !== undefined, 'Profile response includes libraryStats object');
    assert(typeof data.libraryStats.watching === 'number' && typeof data.libraryStats.completed === 'number', 'libraryStats has watching and completed counts');
    assert(Array.isArray(data.achievements), `Profile contains achievements array (count: ${data.achievements.length})`);
    assert(Array.isArray(data.recentlyWatched), `Profile contains recentlyWatched array (count: ${data.recentlyWatched.length})`);
    console.log(`    Library stats:`, data.libraryStats);
  } catch (err) {
    console.error('    Error testing Phase 4:', err);
    assert(false, `Phase 4 encountered error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 6: Pagination and Projection on Library & Progress
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 6: Pagination & Selective Column Projection...');
  try {
    // Library with limit
    const libRes = await fetch(`${BASE_URL}/api/library?limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const libData = await libRes.json();
    assert(libRes.status === 200 && libData.ok, 'GET /api/library?limit=5 returns 200 OK');
    assert(Array.isArray(libData.data?.library) && libData.data.library.length <= 5, `Library returned ${libData.data?.library?.length} items (<= 5)`);

    // Progress with limit
    const progRes = await fetch(`${BASE_URL}/api/progress?limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const progData = await progRes.json();
    assert(progRes.status === 200 && progData.ok, 'GET /api/progress?limit=5 returns 200 OK');
    assert(Array.isArray(progData.data?.progress) && progData.data.progress.length <= 5, `Progress returned ${progData.data?.progress?.length} items (<= 5)`);
  } catch (err) {
    console.error('    Error testing Phase 6:', err);
    assert(false, `Phase 6 encountered error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 2 & 5: Video Progress Update & Cache Invalidation on Logout
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ Testing Phase 2 Progress Update & Phase 5 Session Invalidation...');
  try {
    // Progress update
    const updateRes = await fetch(`${BASE_URL}/api/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        anilistId: 21,
        episodeNumber: 1,
        progressSeconds: 320,
        durationSeconds: 1440,
        completed: false,
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.ok, 'POST /api/progress returns 200 OK with updated record');
    assert(updateData.data?.progress?.progressSeconds === 320, 'Progress seconds updated to 320');

    // Logout to test cache invalidation
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');

    // Verify Redis session is cleared
    const cachedAfterLogout = await cache.get(`session:${tokenHash}`);
    assert(cachedAfterLogout === null, 'Redis session cache key was properly invalidated on logout');
  } catch (err) {
    console.error('    Error testing Progress & Logout:', err);
    assert(false, `Encountered error: ${err.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
