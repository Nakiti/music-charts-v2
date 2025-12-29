import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Timeframe = "daily" | "weekly" | "monthly";

interface GenreChartControlsProps {
  timeframe: Timeframe;
  selectedDate: Date | null;
  onSelectedDateChange: (date: Date | null) => void;
  onTimeframeChange: (t: Timeframe) => void;
  canGoForward: boolean;
  periodLabel: string;
  loading: boolean;
  error: unknown;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
}

const GenreChartControls: React.FC<GenreChartControlsProps> = ({
  timeframe,
  selectedDate,
  onSelectedDateChange,
  onTimeframeChange,
  canGoForward,
  periodLabel,
  onPrevPeriod,
  onNextPeriod,
}) => {
  const handleDateChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;

    if (!value) {
      onSelectedDateChange(null);
      return;
    }

    const dt = new Date(value + "T00:00:00");
    if (Number.isNaN(dt.getTime())) {
      onSelectedDateChange(null);
    } else {
      onSelectedDateChange(dt);
    }
  };

  return (
    <div className="sticky top-20 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-white/5 px-6 md:px-12 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-white/5 rounded-full p-1 border border-white/5">
            {["daily", "weekly", "monthly"].map((t) => (
              <button
                key={t}
                onClick={() => onTimeframeChange(t as Timeframe)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                  timeframe === t
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-zinc-400">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <button
              type="button"
              onClick={onPrevPeriod}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            
            <span className="font-mono text-white/80 min-w-[140px] text-center">
              {periodLabel}
            </span>
            
            <button
              type="button"
              onClick={onNextPeriod}
              disabled={!canGoForward}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full border transition-colors ${
                canGoForward
                  ? "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                  : "bg-transparent text-zinc-600 border-zinc-700 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {timeframe === "daily" && (
            <div className="flex items-center gap-2 text-xs md:text-sm border-l border-white/10 pl-4">
              <input
                type="date"
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                value={
                  selectedDate ? selectedDate.toISOString().split("T")[0] : ""
                }
                max={new Date().toISOString().split("T")[0]}
                onChange={handleDateChange}
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => onSelectedDateChange(null)}
                  className="text-[11px] md:text-xs text-zinc-400 hover:text-white underline decoration-dotted whitespace-nowrap"
                >
                  Today
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenreChartControls;


