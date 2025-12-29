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

## Key Architecture Decisions

- **Wilson Score Ranking**: Uses confidence intervals instead of simple percentages to prevent tracks with few votes from dominating
- **Hybrid Redis + Firestore**: Redis for fast real-time leaderboards, Firestore as source of truth with periodic sync
- **Anonymous Voting**: Users can vote without creating accounts to reduce friction
- **Server-Side Vote Filtering**: API filters out tracks user has already voted on for better performance
- **Scheduled Chart Snapshots**: Historical charts are frozen snapshots, not live queries, for consistency
- **Real-Time Updates**: Firestore `onSnapshot` listeners provide instant chart updates to clients


