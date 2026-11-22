import React, { useState } from 'react';
import { Trash2, Truck, X } from 'lucide-react';
import { api } from '../lib/api';
import type { ShipmentItem, ShipmentStatus } from '../types';

interface NewShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (shipment: ShipmentItem) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

export const NewShipmentModal: React.FC<NewShipmentModalProps> = ({
  open,
  onClose,
  onCreated,
  isAuthenticated,
  onRequireAuth,
}) => {
  const [orderCode, setOrderCode] = useState('2026 - FASLOG - JKT902');
  const [trackingRef, setTrackingRef] = useState('#JKG90218');
  const [status, setStatus] = useState<ShipmentStatus>('IN TRANSIT');
  const [originCode, setOriginCode] = useState('CGK');
  const [originCity, setOriginCity] = useState('Jakarta, ID');
  const [originTime, setOriginTime] = useState('Nov 22, 7.30 AM');
  const [destCode, setDestCode] = useState('SBY');
  const [destCity, setDestCity] = useState('Surabaya, ID');
  const [destTime, setDestTime] = useState('Nov 24, 4.15 PM');
  const [dropoffEta, setDropoffEta] = useState('4:15 PM');
  const [dropoffLocation, setDropoffLocation] = useState('Tanjung Perak Logistics Gate');
  const [dropoffTag, setDropoffTag] = useState('JKG436902RT');
  const [progressPct, setProgressPct] = useState(35);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.createShipment({
        orderCode,
        trackingRef,
        status,
        originCode,
        originCity,
        originTime,
        destCode,
        destCity,
        destTime,
        progressPct,
        dropoffEta,
        dropoffLocation,
        dropoffTag,
      });
      onCreated(res.shipment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/10 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#C4E854]/20 text-[#6F8E11] dark:text-[#C4E854] flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Dispatch New Shipment
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Add a fleet tracking order to JalurKargo
            </p>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 flex items-center justify-between gap-2">
            <span>Sign in required to save new shipments.</span>
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-2.5 py-1 rounded-lg bg-[#C4E854] text-[#0B0C0E] font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Order Code
              </label>
              <input
                type="text"
                required
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Tracking Ref
              </label>
              <input
                type="text"
                required
                value={trackingRef}
                onChange={(e) => setTrackingRef(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Origin Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={originCode}
                onChange={(e) => setOriginCode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Origin City
              </label>
              <input
                type="text"
                required
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Departure
              </label>
              <input
                type="text"
                required
                value={originTime}
                onChange={(e) => setOriginTime(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Dest Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={destCode}
                onChange={(e) => setDestCode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Dest City
              </label>
              <input
                type="text"
                required
                value={destCity}
                onChange={(e) => setDestCity(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                ETA Date
              </label>
              <input
                type="text"
                required
                value={destTime}
                onChange={(e) => setDestTime(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Drop-off Hub
              </label>
              <input
                type="text"
                required
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
              >
                <option value="IN TRANSIT">IN TRANSIT</option>
                <option value="PENDING">PENDING</option>
                <option value="DELIVERED">DELIVERED</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">Route Progress</span>
              <span className="font-mono text-[#6F8E11] dark:text-[#C4E854]">{progressPct}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={progressPct}
              onChange={(e) => setProgressPct(Number(e.target.value))}
              className="w-full accent-[#C4E854]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-xs font-semibold cursor-pointer"
            >
              {loading ? 'Saving...' : 'Create Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ShipmentDetailModalProps {
  shipment: ShipmentItem | null;
  onClose: () => void;
  onUpdated: (shipment: ShipmentItem) => void;
  onDeleted: (id: number) => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

export const ShipmentDetailModal: React.FC<ShipmentDetailModalProps> = ({
  shipment,
  onClose,
  onUpdated,
  onDeleted,
  isAuthenticated,
  onRequireAuth,
}) => {
  const [status, setStatus] = useState<ShipmentStatus>(shipment?.status ?? 'IN TRANSIT');
  const [progressPct, setProgressPct] = useState<number>(shipment?.progressPct ?? 50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (shipment) {
      setStatus(shipment.status);
      setProgressPct(shipment.progressPct);
      setError(null);
    }
  }, [shipment]);

  if (!shipment) return null;

  const handleSave = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateShipment(shipment.id, { status, progressPct });
      onUpdated(res.shipment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setSaving(true);
    try {
      await api.deleteShipment(shipment.id);
      onDeleted(shipment.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/10 shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail modal"
          className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          SHIPMENT MANIFEST
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mt-0.5">
          {shipment.orderCode}
        </h3>
        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          {shipment.shipmentId} · {shipment.trackingRef}
        </p>

        <div className="my-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-[#181A20] border border-zinc-200 dark:border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-zinc-400">Origin</div>
            <div className="font-semibold text-zinc-900 dark:text-white mt-0.5">
              {shipment.originCode} — {shipment.originCity}
            </div>
            <div className="text-zinc-500 tabular-nums mt-0.5">{shipment.originTime}</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-400">Destination</div>
            <div className="font-semibold text-zinc-900 dark:text-white mt-0.5">
              {shipment.destCode} — {shipment.destCity}
            </div>
            <div className="text-zinc-500 tabular-nums mt-0.5">{shipment.destTime}</div>
          </div>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
              Dispatch Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
              className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
            >
              <option value="IN TRANSIT">IN TRANSIT</option>
              <option value="PENDING">PENDING</option>
              <option value="DELIVERED">DELIVERED</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">Live Route Progress</span>
              <span className="font-mono font-semibold text-[#6F8E11] dark:text-[#C4E854] tabular-nums">
                {progressPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progressPct}
              onChange={(e) => setProgressPct(Number(e.target.value))}
              className="w-full accent-[#C4E854]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
