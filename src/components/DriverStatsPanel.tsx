import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { DriverStatItem, TimeframeKey } from '../types';

interface DriverStatsPanelProps {
  stats: DriverStatItem[];
  onExpandClick: () => void;
}

const TIMEFRAMES: TimeframeKey[] = ['W', 'M', '6M', 'Y'];

export const DriverStatsPanel: React.FC<DriverStatsPanelProps> = ({ stats, onExpandClick }) => {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('W');

  const activeStat = stats.find((s) => s.timeframe === timeframe) ??
    stats[0] ?? {
      timeframe: 'W',
      onTheWayPct: 39.7,
      unloadingPct: 28.3,
      loadingPct: 17.4,
      onTheWayDuration: '3 hr 10 min',
      unloadingDuration: '2 hr 15 min',
      loadingDuration: '1 hr 23 min',
    };

  const totalPct = activeStat.onTheWayPct + activeStat.unloadingPct + activeStat.loadingPct;
  const w1 = totalPct > 0 ? (activeStat.onTheWayPct / totalPct) * 100 : 46;
  const w2 = totalPct > 0 ? (activeStat.unloadingPct / totalPct) * 100 : 33;
  const w3 = Math.max(0, 100 - w1 - w2);

  return (
    <section className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-4 sm:p-5 shrink-0">
      {/* Top Row */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-white">
          Driver Statistics
        </h2>
        <button
          type="button"
          onClick={onExpandClick}
          title="View detailed fleet analytics"
          className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Subtitle + Timeframe Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
        <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
          Average Time Per Day By Category
        </p>

        <div className="flex items-center gap-1" role="tablist" aria-label="Statistics timeframe">
          {TIMEFRAMES.map((tf) => {
            const active = tf === timeframe;
            return (
              <button
                key={tf}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md text-[11.5px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'text-zinc-950 dark:text-white bg-zinc-200 dark:bg-white/10'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Segmented Horizontal Proportional Bar */}
      <div className="w-full h-11 rounded-xl overflow-hidden flex border border-zinc-200 dark:border-white/[0.06] mb-4">
        <div
          style={{ width: `${w1}%` }}
          className="h-full bg-[#F1F3F5] text-[#111316] flex items-center px-3.5 text-[13px] font-semibold tabular-nums transition-all duration-300"
        >
          {activeStat.onTheWayPct.toFixed(1)}%
        </div>
        <div
          style={{ width: `${w2}%` }}
          className="h-full bg-[#8A8D93] text-[#111316] flex items-center px-3 text-[13px] font-semibold tabular-nums transition-all duration-300"
        >
          {activeStat.unloadingPct.toFixed(1)}%
        </div>
        <div
          style={{ width: `${w3}%` }}
          className="h-full bg-[#C4C7CE] text-[#111316] flex items-center px-3 text-[13px] font-semibold tabular-nums transition-all duration-300"
        >
          {activeStat.loadingPct.toFixed(1)}%
        </div>
      </div>

      {/* 3 Category Breakdown Rows */}
      <div className="space-y-2.5 text-[13px]">
        <div className="grid grid-cols-12 items-center gap-2">
          <span className="col-span-6 text-zinc-700 dark:text-zinc-200 font-medium">
            On the Way
          </span>
          <span className="col-span-4 text-right text-zinc-700 dark:text-zinc-200 tabular-nums">
            {activeStat.onTheWayDuration}
          </span>
          <span className="col-span-2 text-right font-medium text-zinc-900 dark:text-white tabular-nums">
            {activeStat.onTheWayPct.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-12 items-center gap-2">
          <span className="col-span-6 text-zinc-700 dark:text-zinc-200 font-medium">
            Unloading
          </span>
          <span className="col-span-4 text-right text-zinc-700 dark:text-zinc-200 tabular-nums">
            {activeStat.unloadingDuration}
          </span>
          <span className="col-span-2 text-right font-medium text-zinc-900 dark:text-white tabular-nums">
            {activeStat.unloadingPct.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-12 items-center gap-2">
          <span className="col-span-6 text-zinc-700 dark:text-zinc-200 font-medium">
            Loading
          </span>
          <span className="col-span-4 text-right text-zinc-700 dark:text-zinc-200 tabular-nums">
            {activeStat.loadingDuration}
          </span>
          <span className="col-span-2 text-right font-medium text-zinc-900 dark:text-white tabular-nums">
            {activeStat.loadingPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </section>
  );
};
