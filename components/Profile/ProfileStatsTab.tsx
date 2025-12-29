import React, { useState, useEffect } from "react";
import { TrendingUp, Award, Music2 } from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserStats } from "@/hooks/useUserStats";

interface ProfileStatsTabProps {
  viewedUid: string | null;
  uploads: any[] | undefined;
}

const ProfileStatsTab: React.FC<ProfileStatsTabProps> = ({ viewedUid, uploads }) => {
  const [topGenre, setTopGenre] = useState<string>("—");
  const [topGenrePercentage, setTopGenrePercentage] = useState<number>(0);
  const [votingStreak, setVotingStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const uploadsCount = uploads?.length || 0;
  const userStats = useUserStats(viewedUid, uploadsCount);

  useEffect(() => {
    const fetchStats = async () => {
      if (!viewedUid) {
        setLoading(false);
        return;
      }

      try {
        // 1. Calculate top genre from votes
        const votesQuery = query(
          collection(db, 'votes'),
          where('userId', '==', viewedUid)
        );
        const votesSnapshot = await getDocs(votesQuery);
        
        const genreCounts: Record<string, number> = {};
        let totalVotesWithGenre = 0;
        
        votesSnapshot.forEach((doc) => {
          const data = doc.data();
          const genre = data.genre;
          if (genre) {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            totalVotesWithGenre++;
          }
        });

        // Find top genre
        let maxCount = 0;
        let topGenreName = "—";
        let topGenrePct = 0;
        
        Object.entries(genreCounts).forEach(([genre, count]) => {
          if (count > maxCount) {
            maxCount = count;
            topGenreName = genre;
            topGenrePct = totalVotesWithGenre > 0 
              ? Math.round((count / totalVotesWithGenre) * 100) 
              : 0;
          }
        });

        setTopGenre(topGenreName);
        setTopGenrePercentage(topGenrePct);

        // 2. Calculate voting streak (consecutive days with at least one vote)
        // Get votes ordered by timestamp
        const votesOrderedQuery = query(
          collection(db, 'votes'),
          where('userId', '==', viewedUid),
          orderBy('timestamp', 'desc'),
          limit(100) // Check last 100 votes for streak
        );
        
        const votesOrderedSnapshot = await getDocs(votesOrderedQuery);
        const voteDates = new Set<string>();
        
        votesOrderedSnapshot.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp;
          if (timestamp) {
            const date = timestamp.toDate();
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            voteDates.add(dateStr);
          }
        });

        // Calculate consecutive days from today backwards
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          if (voteDates.has(dateStr)) {
            streak++;
          } else {
            break; // Streak broken
          }
        }

        setVotingStreak(streak);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [viewedUid]);

  // Calculate discovery impact (simplified: tracks that reached top charts)
  // This is a placeholder - you might want to enhance this based on actual chart data
  const discoveryImpact = userStats.votesCast > 0 
    ? Math.min(100, Math.round((userStats.votesCast / 100) * 5)) // Simplified calculation
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white">Discovery Impact</h3>
        </div>
        <div className="text-3xl font-black text-white mb-1">
          {loading ? "..." : `${userStats.votesCast} Votes`}
        </div>
        <p className="text-sm text-zinc-400">
          {userStats.votesCast > 0 
            ? `You've cast ${userStats.votesCast} votes and shaped the charts.`
            : "Start voting to discover trending tracks."}
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white">Current Streak</h3>
        </div>
        <div className="text-3xl font-black text-white mb-1">
          {loading ? "..." : `${votingStreak} ${votingStreak === 1 ? 'Day' : 'Days'}`}
        </div>
        <p className="text-sm text-zinc-400">
          {votingStreak > 0
            ? "Keep voting daily to maintain your streak!"
            : "Start voting to build your streak."}
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400">
            <Music2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white">Top Genre</h3>
        </div>
        <div className="text-3xl font-black text-white mb-1">
          {loading ? "..." : topGenre}
        </div>
        <p className="text-sm text-zinc-400">
          {topGenrePercentage > 0
            ? `${topGenrePercentage}% of your votes are in this genre.`
            : "Vote on tracks to see your favorite genre."}
        </p>
      </div>
    </div>
  );
};

export default ProfileStatsTab;
