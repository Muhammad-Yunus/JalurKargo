import React, { useState } from 'react';
import { Box, ListFilter, MapPin, Plus, Search } from 'lucide-react';
import type { ShipmentItem, ShipmentStatus } from '../types';

interface TrackingListProps {
  shipments: ShipmentItem[];
  selectedId: number | null;
  onSelectShipment: (shipment: ShipmentItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | ShipmentStatus;
  onStatusFilterChange: (status: 'ALL' | ShipmentStatus) => void;
  onOpenNewShipment: () => void;
  loading: boolean;
}

function TruckSilhouetteSvg({ active }: { active: boolean }) {
  return (
    <svg
      width="34"
      height="16"
      viewBox="0 0 38 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
      aria-hidden="true"
    >
      {/* Trailer box */}
      <rect
        x="1"
        y="2"
        width="23"
        height="11.5"
        rx="1.5"
        fill={active ? '#F5F7FA' : '#D4D7DD'}
        stroke="#1C1F24"
        strokeWidth="0.8"
      />
      {/* Trailer rib lines */}
      <line x1="6" y1="3.5" x2="6" y2="12" stroke="#D1D5DB" strokeWidth="0.6" />
      <line x1="11" y1="3.5" x2="11" y2="12" stroke="#D1D5DB" strokeWidth="0.6" />
      <line x1="16" y1="3.5" x2="16" y2="12" stroke="#D1D5DB" strokeWidth="0.6" />
      {/* Cab */}
      <path
        d="M24.5 5H31.2C32.4 5 33.4 5.7 33.9 6.8L35.4 9.8C35.8 10.5 36 11.2 36 12V13.5H24.5V5Z"
        fill={active ? '#FFFFFF' : '#E5E7EB'}
        stroke="#1C1F24"
        strokeWidth="0.8"
      />
      {/* Windshield */}
      <path d="M29.5 6.2H32.2L33.5 9.2H29.5V6.2Z" fill="#2A2F37" />
      {/* Wheels */}
      <circle cx="7.5" cy="14.2" r="2.2" fill="#181A1E" stroke="#9CA3AF" strokeWidth="0.8" />
      <circle cx="19" cy="14.2" r="2.2" fill="#181A1E" stroke="#9CA3AF" strokeWidth="0.8" />
      <circle cx="31.5" cy="14.2" r="2.2" fill="#181A1E" stroke="#9CA3AF" strokeWidth="0.8" />
    </svg>
  );
}

export const TrackingList: React.FC<TrackingListProps> = ({
  shipments,
  selectedId,
  onSelectShipment,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenNewShipment,
  loading,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <section className="w-full lg:w-[370px] xl:w-[390px] shrink-0 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium">Your Order</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-tight mt-0.5">
            Tracking list
          </h1>
        </div>

        <div className="relative flex items-center gap-1.5 mt-1">
          <button
            type="button"
            onClick={onOpenNewShipment}
            title="New Shipment"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-[#17191E] border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-200 hover:border-[#C4E854]/60 hover:text-[#6F8E11] dark:hover:text-[#C4E854] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            title="Filter shipments"
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
              statusFilter !== 'ALL'
                ? 'bg-[#C4E854]/15 border-[#C4E854]/50 text-[#6F8E11] dark:text-[#C4E854]'
                : 'bg-zinc-100 dark:bg-[#17191E] border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/20'
            }`}
          >
            <ListFilter className="w-4 h-4" />
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-44 rounded-xl bg-white dark:bg-[#16181D] border border-zinc-200 dark:border-white/10 shadow-2xl p-1.5 z-30">
              {(['ALL', 'IN TRANSIT', 'PENDING', 'DELIVERED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    onStatusFilterChange(status);
                    setFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[#C4E854]/15 text-[#6F8E11] dark:text-[#C4E854]'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
                  }`}
                >
                  {status === 'ALL' ? 'All Shipments' : status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3.5 shrink-0">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="2025 - FASLOG - C4N5A45"
          aria-label="Search tracking number or route"
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-[#1E2026] border border-zinc-200 dark:border-white/[0.07] text-[13px] font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-400 focus:outline-none focus:border-[#C4E854]/60 transition-colors"
        />
      </div>

      {/* Scrollable Shipment Cards */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[174px] rounded-2xl bg-zinc-100 dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.06] animate-pulse p-4"
            />
          ))
        ) : shipments.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-6 text-center space-y-2.5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              No shipments ingested yet
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Push fleet orders via <code className="font-mono">POST /api/ingest/shipments</code>{' '}
              with your API Key, run <code className="font-mono">npm run simulate</code>, or create
              an order manually.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {(searchQuery || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    onStatusFilterChange('ALL');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#C4E854] text-[#0B0C0E] text-xs font-semibold"
              >
                Swagger Docs
              </a>
            </div>
          </div>
        ) : (
          shipments.map((item) => {
            const isSelected = item.id === selectedId;
            const isPending = item.status === 'PENDING';
            const clampedProgress = Math.max(8, Math.min(92, item.progressPct));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectShipment(item)}
                className={`w-full text-left rounded-2xl p-4 transition-all duration-200 border cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#EBF5CB] via-[#F6F9EB] to-white dark:from-[#212A13] dark:via-[#14190F] dark:to-[#111316] border-[#82A818]/60 dark:border-[#C4E854]/60 shadow-[0_0_24px_rgba(196,232,84,0.12)]'
                    : 'bg-white dark:bg-[#121418] border-zinc-200 dark:border-white/[0.07] hover:border-zinc-300 dark:hover:border-white/20'
                }`}
              >
                {/* Top Row: Order Code + Status */}
                <div className="flex items-start justify-between gap-2 mb-3.5">
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-semibold tracking-tight text-zinc-900 dark:text-white truncate">
                      {item.orderCode}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {item.trackingRef}
                    </div>
                  </div>
                  <span
                    className={`text-[10.5px] font-semibold tracking-wider uppercase whitespace-nowrap shrink-0 mt-0.5 ${
                      item.status === 'IN TRANSIT'
                        ? 'text-[#6F8E11] dark:text-[#C4E854]'
                        : item.status === 'DELIVERED'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-400 dark:text-zinc-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Route Origin & Destination */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                      {item.originCode}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {item.originCity}
                    </div>
                    <div className="inline-block mt-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#23262C] text-[10.5px] font-medium text-zinc-700 dark:text-zinc-200 tabular-nums">
                      {item.originTime}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                      {item.destCode}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {item.destCity}
                    </div>
                    <div className="inline-block mt-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#23262C] text-[10.5px] font-medium text-zinc-700 dark:text-zinc-200 tabular-nums">
                      {item.destTime}
                    </div>
                  </div>
                </div>

                {/* Progress Track with Cube, Truck SVG, and Pin */}
                <div className="relative flex items-center gap-2 pt-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      !isPending
                        ? 'bg-[#C4E854]/15 text-[#6F8E11] dark:text-[#C4E854]'
                        : 'bg-indigo-500/15 text-indigo-400'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                  </div>

                  <div className="relative flex-1 h-5 flex items-center">
                    {/* Background dashed line */}
                    <div className="w-full border-t border-dashed border-zinc-300 dark:border-zinc-600/80" />

                    {/* Active lime progress line */}
                    <div
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all duration-300 ${
                        isPending ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-[#82A818] dark:bg-[#C4E854]'
                      }`}
                      style={{ width: `${clampedProgress}%` }}
                    />

                    {/* Truck Icon positioned at progress */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300 z-10"
                      style={{ left: `${clampedProgress}%` }}
                    >
                      <TruckSilhouetteSvg active={!isPending} />
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      item.progressPct >= 80 && !isPending
                        ? 'bg-[#C4E854]/20 text-[#6F8E11] dark:text-[#C4E854]'
                        : 'text-zinc-700 dark:text-white'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};
