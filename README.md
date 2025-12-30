# Soundboard

A community-driven music discovery platform where users vote on SoundCloud tracks to build real-time and historical leaderboards.

## What It Is

Soundboard allows users to:
- Discover new music by voting (FIRE/PASS) on random tracks in genre-specific "Arenas"
- View live leaderboards updated in real-time
- Browse historical charts (daily, weekly, monthly, yearly)
- Upload tracks via SoundCloud URLs
- Build profiles with collections, followers, and stats

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Functions, Auth)
- **Infrastructure**: Upstash Redis (rate limiting, leaderboards)
- **External**: SoundCloud API (track embedding)

## Core Architecture: How Voting and Leaderboards Work

This document explains how votes flow through the system, how scores are calculated, and how users see live and historical leaderboards.

### Overview: The Data Flow

```
User Votes → Firestore Vote Document → Cloud Function Trigger → Redis Leaderboard Update
                                                              ↓
                                    Sync Job (every 5 min) → Firestore Track Stats Update
                                                              ↓
                                    Live Update Job (every 2 min) → leaderboards_live Document
                                                              ↓
                                    Client onSnapshot Listener → Real-Time UI Update
```

For historical charts:
```
Scheduled Jobs (daily/weekly/monthly) → Generate Snapshot → leaderboards Collection
                                                              ↓
                                    Client Query → Historical Chart Display
```

---

## Part 1: How Voting Updates Scores

### Step 1: User Casts a Vote (Client-Side)

When a user votes FIRE or PASS on a track:

1. **`useVoting` hook** (`hooks/useVoting.ts`) initiates the vote
2. **Anonymous auth**: If no user is authenticated, the system transparently creates an anonymous Firebase account
3. **Firestore Transaction**: Uses `runTransaction` to ensure atomicity:
   - Checks if user already voted (prevents duplicate votes)
   - Creates a vote document: `votes/{userId}_{trackId}`
   - If FIRE vote, also creates a like document: `userLikes/{userId}_{trackId}`
   - Creates an activity log entry

**Key Documents Created:**
- `votes/{userId}_{trackId}` - The vote record
- `userLikes/{userId}_{trackId}` - Persistent like (only for FIRE votes)
- `activity/{activityId}` - Activity feed entry

**Important**: The client does NOT update track stats directly. This keeps client code simple and ensures server-side validation.

### Step 2: Cloud Function Trigger (Event-Driven)

When a vote document is created, the `onVoteUpdate` Cloud Function (`functions/src/ranking.ts`) automatically triggers:

1. **Validates vote data**: Ensures trackId, voteType, and userId exist
2. **Updates Redis counters**:
   - Increments `track:{trackId}:total` (total votes)
   - If FIRE vote, increments `track:{trackId}:fires` (FIRE votes)
3. **Calculates Wilson Score**: Reads current counts from Redis and calculates the Wilson Score (see scoring section below)
4. **Updates Redis leaderboards**: Adds/updates the track in Redis sorted sets:
   - `leaderboard:{genre}:daily` - Genre-specific daily leaderboard
   - `leaderboard:global:daily` - Global daily leaderboard

**Why Redis First?**
- Redis is extremely fast for leaderboard operations (sorted sets)
- Handles high write throughput without blocking
- Leaderboards update in real-time without querying Firestore

### Step 3: Sync Redis to Firestore (Every 5 Minutes)

The `syncRedisToFirestore` scheduled job runs every 5 minutes to sync vote counts back to Firestore:

1. **Collects all track IDs** from Redis leaderboards
2. **Batch processes** tracks (500 at a time):
   - Reads current vote counts from Redis
   - Recalculates Wilson Score and Trend Score
   - Updates Firestore track document:
     - `stats.votesFire`
     - `stats.totalVotes`
     - `stats.wilsonScore`
     - `stats.trendScore`

**Why This Approach?**
- Firestore is the **source of truth** - can rebuild Redis if needed
- Batch updates are more efficient than per-vote writes
- 5-minute delay is acceptable for non-critical stats
- Prevents Firestore write quota exhaustion

### Score Calculation: Wilson Score

The system uses **Wilson Score** (confidence interval) instead of simple percentages to prevent tracks with few votes from dominating leaderboards.

**Formula:**
```
Wilson Score = Lower bound of 95% confidence interval
             = (p̂ + z²/(2n) - z√((p̂(1-p̂) + z²/(4n))/n)) / (1 + z²/n)

Where:
- p̂ = proportion of FIRE votes (votesFire / totalVotes)
- n = total votes
- z = 1.96 (for 95% confidence)
```

**Why Wilson Score?**
- A track with 1 FIRE out of 1 vote (100%) shouldn't outrank a track with 950 FIRE out of 1000 votes (95%)
- Wilson Score accounts for sample size - more votes = higher confidence
- Returns a score between 0-100 (percentage)
- Ensures tracks need at least 5 votes to appear in historical snapshots

---

## Part 2: How Leaderboards Are Read

The system supports two types of leaderboards: **Live** (real-time) and **Historical** (snapshots).

### Live Leaderboards (Today's Daily Chart)

Live leaderboards show current rankings and update every 2 minutes.

#### Architecture Flow:

1. **Scheduled Update Job** (`updateLiveLeaderboards`):
   - Runs **every 2 minutes**
   - Queries Firestore tracks ordered by `stats.wilsonScore` DESC
   - For each genre (and global):
     - Fetches top 50 tracks
     - Adds display stats (peak rank, streak days, movement, velocity)
     - Writes to `leaderboards_live/{genre}_daily` document

2. **Client Real-Time Listener** (`useRealtimeLeaderboard` hook):
   - Uses Firestore `onSnapshot` on `leaderboards_live/{genre}_daily`
   - Automatically receives updates when the document changes (every 2 minutes)
   - No polling needed - instant updates when available

3. **Fallback Chain** (if `leaderboards_live` is unavailable):
   - Tries Redis: `leaderboard:{genre}:daily` sorted set
   - Falls back to Firestore query: `tracks` collection ordered by `stats.wilsonScore`
   - API route (`/api/leaderboard/[genre]`) handles this logic

**Why This Architecture?**
- `leaderboards_live` documents are small and update frequently
- `onSnapshot` listeners are efficient (Firestore only sends diffs)
- Clients get instant updates without polling
- Fallback ensures resilience if jobs fail

#### Display Stats (Peak, Streak, Movement, Velocity)

These stats are calculated daily and stored on track documents:

- **Peak Rank**: Best rank achieved (lower is better, e.g., #1 is best)
- **Streak Days**: Consecutive days on the chart
- **Movement**: Change in rank from yesterday (positive = moved up)
- **Velocity**: Percentage change in rank (e.g., "+25%" = moved up 25%)

Updated daily by `chartDailyUpdate` job (runs at midnight).

### Historical Leaderboards (Past Dates)

Historical charts are **frozen snapshots** that never change. This ensures consistency when viewing past dates.

#### Snapshot Generation:

1. **Daily Snapshots** (`chartDailyUpdate`):
   - Runs **once daily at midnight** (Pacific time)
   - For each genre:
     - Queries current top 50 tracks by Wilson Score
     - Calculates and updates track history stats (peak, streak, movement, velocity)
     - Saves snapshot to `leaderboards/{genre}_daily_{YYYY-MM-DD}`

2. **Weekly Snapshots** (`chartWeeklyGlobal`):
   - Runs **every Monday at midnight**
   - Aggregates votes from the previous week (Monday-Sunday)
   - Generates snapshots for `leaderboards/{genre}_weekly_{YYYY-WW}`

3. **Monthly Snapshots** (`chartMonthlyGlobal`):
   - Runs **1st of each month at midnight**
   - Aggregates votes from the previous month
   - Generates snapshots for `leaderboards/{genre}_monthly_{YYYY-MM}`

4. **Yearly Snapshots** (`chartYearlyGlobal`):
   - Runs **January 1st at midnight**
   - Aggregates votes from the previous year
   - Generates snapshots for `leaderboards/{genre}_yearly_{YYYY}`

#### Snapshot Structure:

Each snapshot document contains:
```typescript
{
  periodId: string,        // e.g., "2024-01-15", "2024-W03", "2024-01"
  genre: string,           // e.g., "hiphop", "global"
  type: string,            // "DAILY", "WEEKLY", "MONTHLY", "YEARLY"
  generatedAt: Timestamp,
  tracks: Track[]          // Top 50 tracks with rank, score, metadata
}
```

#### Client Reading Historical Charts:

1. **`useChart` hook** determines if viewing live or historical:
   - If viewing today's daily chart → uses `useRealtimeLeaderboard` (live)
   - Otherwise → queries `leaderboards` collection with filters:
     - `type == "DAILY"` (or WEEKLY/MONTHLY/YEARLY)
     - `genre == {genre}`
     - `periodId == {periodId}`

2. **Cache layer**: Historical data is cached for 5 minutes (doesn't change)

**Why Snapshots?**
- Historical charts should be **immutable** - what was #1 last week shouldn't change
- Avoids expensive date-range queries on every page load
- Faster reads (single document lookup vs complex queries)
- Allows tracking of rank changes over time

---

## Part 3: How Components Work Together

### Document Collections

#### Core Collections:

1. **`tracks/{trackId}`** - Track documents (source of truth)
   - Contains: metadata, stats (votesFire, totalVotes, wilsonScore), chart history
   - Updated by: `syncRedisToFirestore` job (every 5 min)

2. **`votes/{userId}_{trackId}`** - Vote records
   - Created by: Client transaction
   - Triggers: `onVoteUpdate` Cloud Function

3. **`leaderboards_live/{genre}_daily`** - Live leaderboard summaries
   - Updated by: `updateLiveLeaderboards` job (every 2 min)
   - Read by: Client `onSnapshot` listeners

4. **`leaderboards/{chartId}`** - Historical snapshots
   - Created by: Scheduled snapshot jobs (daily/weekly/monthly/yearly)
   - Never updated (immutable)

5. **`userVotes/{userId}`** - User vote aggregation
   - Tracks which tracks a user has voted on
   - Used for filtering discovery queue

6. **`userLikes/{userId}_{trackId}`** - Persistent likes
   - Created when user votes FIRE
   - Used for user collections

### Redis Data Structures

1. **Counters**:
   - `track:{trackId}:fires` - FIRE vote count
   - `track:{trackId}:total` - Total vote count

2. **Sorted Sets** (Leaderboards):
   - `leaderboard:{genre}:daily` - Score → Track ID mapping
   - Used for fast leaderboard queries and updates

### Scheduled Jobs Summary

| Job | Schedule | Purpose |
|-----|----------|---------|
| `syncRedisToFirestore` | Every 5 minutes | Sync vote counts from Redis to Firestore |
| `updateLiveLeaderboards` | Every 2 minutes | Update `leaderboards_live` documents |
| `chartDailyUpdate` | Daily at midnight | Generate daily snapshots + update track history |
| `chartWeeklyGlobal` | Mondays at midnight | Generate weekly snapshots |
| `chartMonthlyGlobal` | 1st of month at midnight | Generate monthly snapshots |
| `chartYearlyGlobal` | Jan 1st at midnight | Generate yearly snapshots |

---

## Key Architecture Decisions

- **Wilson Score Ranking**: Uses confidence intervals instead of simple percentages to prevent tracks with few votes from dominating
- **Hybrid Redis + Firestore**: Redis for fast real-time leaderboards, Firestore as source of truth with periodic sync
- **Anonymous Voting**: Users can vote without creating accounts to reduce friction
- **Server-Side Vote Filtering**: API filters out tracks user has already voted on for better performance
- **Scheduled Chart Snapshots**: Historical charts are frozen snapshots, not live queries, for consistency
- **Real-Time Updates**: Firestore `onSnapshot` listeners provide instant chart updates to clients
- **Event-Driven Score Updates**: Cloud Functions trigger on vote creation for immediate Redis updates
- **Batch Sync Pattern**: Redis updates are batched and synced to Firestore every 5 minutes to optimize writes

---

## Example Flow: User Votes on Track

1. **User clicks FIRE** → `useVoting.castVote()` called
2. **Transaction creates** `votes/user123_track456` document
3. **Cloud Function triggers** (`onVoteUpdate`)
4. **Redis updated**: `track:track456:fires` += 1, `track:track456:total` += 1
5. **Wilson Score calculated**: e.g., 87.5% (from 875 fires / 1000 total)
6. **Redis leaderboard updated**: Track added to `leaderboard:hiphop:daily` with score 87500
7. **5 minutes later**: `syncRedisToFirestore` updates `tracks/track456` stats
8. **2 minutes later**: `updateLiveLeaderboards` queries Firestore, writes to `leaderboards_live/hiphop_daily`
9. **Client receives update**: `onSnapshot` fires, UI updates automatically

---

## Example Flow: User Views Historical Chart

1. **User selects** "Hip-Hop - Weekly - Week of Jan 8, 2024"
2. **Client calculates** periodId: "2024-W02"
3. **`useChart` hook** queries: `leaderboards` where `type == "WEEKLY"`, `genre == "hiphop"`, `periodId == "2024-W02"`
4. **Firestore returns** snapshot document (created the Monday after that week ended)
5. **UI displays** frozen chart with top 50 tracks from that week

---

This architecture ensures:
- ✅ Real-time leaderboards update every 2 minutes
- ✅ Historical charts remain consistent (never change)
- ✅ High write throughput via Redis
- ✅ Data persistence via Firestore
- ✅ Efficient client updates via `onSnapshot`
- ✅ Resilience with fallback chains
