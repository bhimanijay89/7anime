import prisma from '../backend/dist/db/client.js';

async function investigate() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 SUPABASE EGRESS ROOT-CAUSE INVESTIGATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Check Table Sizes in PostgreSQL
  console.log('▶ 1. Database Table Sizes & Row Counts:');
  const tableSizes = await prisma.$queryRaw`
    SELECT
      relname AS table_name,
      n_live_tup AS estimated_rows,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      pg_total_relation_size(relid) AS total_bytes
    FROM pg_stat_user_tables
    ORDER BY total_bytes DESC;
  `;
  console.table(tableSizes);

  // 2. Query pg_stat_statements for top queries by calls and total time
  console.log('\n▶ 2. Top SQL Statements by Execution Calls (pg_stat_statements):');
  try {
    const topCalls = await prisma.$queryRaw`
      SELECT
        calls,
        round(total_exec_time::numeric, 2) AS total_ms,
        round(mean_exec_time::numeric, 2) AS avg_ms,
        rows,
        substr(query, 1, 100) AS query_preview
      FROM pg_stat_statements
      ORDER BY calls DESC
      LIMIT 15;
    `;
    console.table(topCalls);
  } catch (err) {
    console.warn('pg_stat_statements query failed:', err.message);
  }

  // 3. Top SQL Statements by Total Rows Returned
  console.log('\n▶ 3. Top SQL Statements by Rows Returned/Processed (pg_stat_statements):');
  try {
    const topRows = await prisma.$queryRaw`
      SELECT
        calls,
        rows,
        round((rows::numeric / NULLIF(calls, 0)), 1) AS avg_rows_per_call,
        round(total_exec_time::numeric, 2) AS total_ms,
        substr(query, 1, 100) AS query_preview
      FROM pg_stat_statements
      ORDER BY rows DESC
      LIMIT 15;
    `;
    console.table(topRows);
  } catch (err) {
    console.warn('pg_stat_statements rows query failed:', err.message);
  }

  // 4. Activity Dates Breakdown for Watch Progress (around Nov 13-15)
  console.log('\n▶ 4. Watch Progress Activity Timestamps (Grouped by Date):');
  try {
    const progressByDate = await prisma.$queryRaw`
      SELECT
        date_trunc('day', "updatedAt") AS day,
        COUNT(*) AS update_count,
        COUNT(DISTINCT "userId") AS active_users,
        COUNT(DISTINCT "anilistId") AS active_anime
      FROM "watch_progress"
      GROUP BY 1
      ORDER BY day DESC
      LIMIT 14;
    `;
    console.table(progressByDate);
  } catch (err) {
    console.warn('Watch progress date breakdown failed:', err.message);
  }

  // 5. Activity Dates Breakdown for Sessions
  console.log('\n▶ 5. User Sessions Timestamps (Grouped by Date):');
  try {
    const sessionsByDate = await prisma.$queryRaw`
      SELECT
        date_trunc('day', "createdAt") AS day,
        COUNT(*) AS session_count,
        COUNT(DISTINCT "userId") AS unique_users
      FROM "sessions"
      GROUP BY 1
      ORDER BY day DESC
      LIMIT 14;
    `;
    console.table(sessionsByDate);
  } catch (err) {
    console.warn('Sessions date breakdown failed:', err.message);
  }

  // 6. Activity Dates Breakdown for Library Entries
  console.log('\n▶ 6. Library Entries Timestamps (Grouped by Date):');
  try {
    const libraryByDate = await prisma.$queryRaw`
      SELECT
        date_trunc('day', "updatedAt") AS day,
        COUNT(*) AS entries_updated,
        COUNT(DISTINCT "userId") AS active_users
      FROM "library_entries"
      GROUP BY 1
      ORDER BY day DESC
      LIMIT 14;
    `;
    console.table(libraryByDate);
  } catch (err) {
    console.warn('Library entries date breakdown failed:', err.message);
  }

  // 7. Activity Dates Breakdown for User Achievements
  console.log('\n▶ 7. User Achievements Unlocks (Grouped by Date):');
  try {
    const achievementsByDate = await prisma.$queryRaw`
      SELECT
        date_trunc('day', "unlockedAt") AS day,
        COUNT(*) AS unlock_count
      FROM "user_achievements"
      GROUP BY 1
      ORDER BY day DESC
      LIMIT 14;
    `;
    console.table(achievementsByDate);
  } catch (err) {
    console.warn('User achievements date breakdown failed:', err.message);
  }

  // 8. Database Server Level Metrics (Database egress / transactions / tuples)
  console.log('\n▶ 8. Database Transaction & Tuple Stats (pg_stat_database):');
  try {
    const dbStats = await prisma.$queryRaw`
      SELECT
        datname,
        numbackends AS active_connections,
        xact_commit,
        xact_rollback,
        blks_read,
        blks_hit,
        tup_returned,
        tup_fetched,
        tup_inserted,
        tup_updated,
        tup_deleted
      FROM pg_stat_database
      WHERE datname = current_database();
    `;
    console.table(dbStats);
  } catch (err) {
    console.warn('pg_stat_database query failed:', err.message);
  }

  // 9. Inspect Database Connections right now
  console.log('\n▶ 9. Active Database Connections by Application Name / Client IP:');
  try {
    const activeConns = await prisma.$queryRaw`
      SELECT
        client_addr,
        application_name,
        state,
        COUNT(*) AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY client_addr, application_name, state
      ORDER BY count DESC;
    `;
    console.table(activeConns);
  } catch (err) {
    console.warn('Active connections query failed:', err.message);
  }

  await prisma.$disconnect();
}

investigate().catch(err => {
  console.error('Fatal investigation error:', err);
  process.exit(1);
});
