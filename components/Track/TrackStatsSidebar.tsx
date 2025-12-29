import { TrendingUp, BarChart2, Users, Flame, Award, Calendar, ArrowUp, ArrowDown, Zap, Clock } from "lucide-react";
import StatPill from "./StatPill";

interface TrackStatsSidebarProps {
  fireScore: string;
  totalVotes: number;
  trendScore: number;
  votesFire: number;
  votesPass: number;
  peak?: number;
  streak?: string;
  movement?: number;
  velocity?: string;
  createdAt?: any;
  displayStats?: any;
  genre?: string;
}

const TrackStatsSidebar = ({
  fireScore,
  totalVotes,
  trendScore,
  votesFire,
  votesPass,
  peak,
  streak,
  movement,
  velocity,
  createdAt,
  displayStats,
  genre,
}: TrackStatsSidebarProps) => {
  const firePercentage = totalVotes > 0 ? ((votesFire / totalVotes) * 100).toFixed(1) : 0;
  const passPercentage = totalVotes > 0 ? ((votesPass / totalVotes) * 100).toFixed(1) : 0;
  
  // Get genre-specific stats or fall back to global
  const genreStats = genre && displayStats?.[genre] ? displayStats[genre] : displayStats?.global || {};
  const displayPeak = genreStats.peak || peak;
  const displayStreak = genreStats.streak || streak;
  const displayMovement = genreStats.movement ?? movement;
  const displayVelocity = genreStats.velocity || velocity;

  return (
    <div className="lg:col-span-1 space-y-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
        Current Metrics
      </h3>

      {/* 1. Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-2 gap-4">
        <StatPill label="Fire Score" value={`${fireScore}%`} icon={Flame} color="sky" />
        <StatPill
          label="Total Votes"
          value={totalVotes.toLocaleString()}
          icon={Users}
          color="sky"
        />
      </div>

      {/* 2. Chart Performance */}
      {(displayPeak || displayStreak || displayMovement !== undefined || displayVelocity) && (
        <div className="p-4 bg-zinc-900 rounded-xl border border-white/10 space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" /> Chart Performance
          </h4>
          {displayPeak && (
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-sm font-medium">Peak Rank</span>
              <span className="text-lg font-black text-yellow-400">
                #{displayPeak}
              </span>
            </div>
          )}
          {displayStreak && (
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Streak
              </span>
              <span className="text-lg font-black text-sky-400">
                {displayStreak}
              </span>
            </div>
          )}
          {displayMovement !== undefined && displayMovement !== 0 && (
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-sm font-medium">Movement (24h)</span>
              <span className={`text-lg font-black flex items-center gap-1 ${
                displayMovement > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {displayMovement > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(displayMovement)}
              </span>
            </div>
          )}
          {displayVelocity && displayVelocity !== '0%' && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" /> Velocity
              </span>
              <span className={`text-lg font-black ${
                displayVelocity.startsWith('+') ? 'text-green-400' : 
                displayVelocity.startsWith('-') ? 'text-red-400' : 'text-zinc-400'
              }`}>
                {displayVelocity}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Velocity & Trending */}
      <div className="p-4 bg-zinc-900 rounded-xl border border-white/10 space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" /> Trending
        </h4>
        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
          <span className="text-sm font-medium">Trend Score</span>
          <span className="text-lg font-black text-white">
            {trendScore.toFixed(1)}
          </span>
        </div>
        {createdAt && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Uploaded
            </span>
            <span className="text-sm font-medium text-zinc-400">
              {new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>

      {/* 4. Community Rating Breakdown */}
      <div className="p-4 bg-zinc-900 rounded-xl border border-white/10 space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-pink-400" /> Rating Breakdown
        </h4>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Voted FIRE</span>
            <span className="font-bold text-green-400">{firePercentage}% ({votesFire})</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${firePercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Voted PASS</span>
            <span className="font-bold text-red-400">{passPercentage}% ({votesPass})</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${passPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackStatsSidebar;


