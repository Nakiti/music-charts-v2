import React from "react";
import { Activity } from "lucide-react";

interface LiveActivitySidebarProps {
  liveActivity: any[];
}

const LiveActivitySidebar: React.FC<LiveActivitySidebarProps> = ({
  liveActivity,
}) => {
  return (
    <aside className="hidden md:flex md:col-span-3 flex-col bg-zinc-900/30">
      <div className="p-6 h-full overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-zinc-400 uppercase text-xs font-bold tracking-widest">
            <Activity className="w-4 h-4" /> Live Activity
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>

        <div className="space-y-6 relative">
          {/* Connecting Line */}
          <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-800" />

          {liveActivity.slice(0, 7).map((activity: any, i: number) => (
            <div
              key={activity.id ?? i}
              className="relative pl-8 group animate-in slide-in-from-right-4 fade-in duration-500"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Timeline Dot */}
              <div
                className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-zinc-950 ${
                  activity.action === "FIRE" ? "bg-green-500" : "bg-red-500"
                } z-10`}
              />

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-white hover:underline cursor-pointer">
                    {activity.username || "Anonymous"}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {activity.createdAt
                      ? activity.createdAt.toLocaleTimeString()
                      : ""}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  voted{" "}
                  <span
                    className={`font-bold ${
                      activity.action === "FIRE"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {activity.action}
                  </span>{" "}
                  on{" "}
                  <span className="text-zinc-200">
                    &quot;{activity.trackTitle || "Unknown Track"}&quot;
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default LiveActivitySidebar;


