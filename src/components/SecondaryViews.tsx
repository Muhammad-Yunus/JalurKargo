import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  KeyRound,
  Mail,
  MapPin,
  Package,
  Plus,
  Shield,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  ApiKeyItem,
  AuthUser,
  CustomerItem,
  DriverStatItem,
  InboxMessageItem,
  NavTab,
  ShipmentItem,
} from '../types';

interface SecondaryViewsProps {
  activeTab: Exclude<NavTab, 'tracking'>;
  shipments: ShipmentItem[];
  customers: CustomerItem[];
  inboxMessages: InboxMessageItem[];
  stats: DriverStatItem[];
  user: AuthUser | null;
  storageMode: 'postgres' | 'memory';
  onOpenTracking: (shipment?: ShipmentItem) => void;
  onOpenNewShipment: () => void;
  onMarkMessageRead: (id: number) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const SecondaryViews: React.FC<SecondaryViewsProps> = ({
  activeTab,
  shipments,
  customers,
  inboxMessages,
  stats,
  user,
  storageMode,
  onOpenTracking,
  onOpenNewShipment,
  onMarkMessageRead,
  onOpenAuth,
  onLogout,
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [envKeyConfigured, setEnvKeyConfigured] = useState(false);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const loadApiKeys = useCallback(async () => {
    if (!user) {
      setApiKeys([]);
      return;
    }
    setKeysLoading(true);
    setKeysError(null);
    try {
      const res = await api.getApiKeys();
      setApiKeys(res.keys);
      setEnvKeyConfigured(res.envKeyConfigured);
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : 'Failed to load API keys.');
    } finally {
      setKeysLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'settings' && user) {
      loadApiKeys();
    }
  }, [activeTab, user, loadApiKeys]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyName.trim();
    if (!trimmed) return;
    setCreatingKey(true);
    setKeysError(null);
    try {
      const res = await api.createApiKey(trimmed);
      setApiKeys((prev) => [res.apiKey, ...prev]);
      setCreatedRawKey(res.rawKey);
      setNewKeyName('');
      setCopiedKey(false);
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : 'Failed to generate API key.');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: number) => {
    setKeysError(null);
    try {
      await api.revokeApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : 'Failed to revoke API key.');
    }
  };

  const handleCopyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      setCopiedKey(false);
    }
  };

  if (activeTab === 'dashboard') {
    const inTransit = shipments.filter((s) => s.status === 'IN TRANSIT').length;
    const pending = shipments.filter((s) => s.status === 'PENDING').length;
    const delivered = shipments.filter((s) => s.status === 'DELIVERED').length;
    const weekly = stats.find((s) => s.timeframe === 'W') ?? stats[0];

    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Fleet Overview</p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              Operations Dashboard
            </h1>
          </div>
          <button
            type="button"
            onClick={onOpenNewShipment}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Shipment</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Active Fleet</div>
            <div className="text-2xl font-bold text-[#6F8E11] dark:text-[#C4E854] mt-1 tabular-nums">
              {inTransit}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Routes currently in transit</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Pending Dispatch</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 tabular-nums">
              {pending}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Awaiting dock release</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Completed Deliveries</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 tabular-nums">
              {delivered}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Verified drop-offs</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">On-the-Way Efficiency</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 tabular-nums">
              {weekly ? `${weekly.onTheWayPct.toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Weekly driver road utilization</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
            Active Routes Snapshot
          </h2>
          {shipments.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                No active fleet shipments ingested yet
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Send shipments via <code className="font-mono">POST /api/ingest/shipments</code>,
                run <code className="font-mono">npm run simulate</code>, or create an order manually.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-white/[0.06]">
              {shipments.map((s) => (
                <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {s.orderCode}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {s.originCode} ({s.originCity}) → {s.destCode} ({s.destCity})
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-300 tabular-nums">
                      {s.progressPct}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenTracking(s)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] hover:bg-[#C4E854] hover:text-[#0B0C0E] text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      Track Live
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'inbox') {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Communications</p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Dispatch Inbox</h1>
        </div>
        {inboxMessages.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-8 text-center space-y-2">
            <Mail className="w-6 h-6 mx-auto text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No dispatch alerts yet
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Incoming messages pushed to <code className="font-mono">POST /api/ingest/inbox</code>{' '}
              will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inboxMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-2xl p-4 border transition-colors ${
                  msg.unread
                    ? 'bg-white dark:bg-[#15181E] border-[#82A818]/40 dark:border-[#C4E854]/40'
                    : 'bg-white dark:bg-[#121418] border-zinc-200 dark:border-white/[0.08]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#C4E854]/15 text-[#6F8E11] dark:text-[#C4E854] flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {msg.senderName}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {msg.senderRole} · <span className="font-mono">{msg.shipmentRef}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 tabular-nums">{msg.timeLabel}</span>
                    {msg.unread && (
                      <button
                        type="button"
                        onClick={() => onMarkMessageRead(msg.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#C4E854] text-[#0B0C0E] text-[11px] font-semibold cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-3">
                  {msg.subject}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{msg.preview}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'orders') {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Logistics Ledger</p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              Shipment Orders
            </h1>
          </div>
          <button
            type="button"
            onClick={onOpenNewShipment}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-[11px] uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4">Order Code</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Progress</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05] text-xs">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-zinc-500 dark:text-zinc-400">
                    No shipment orders recorded yet. Ingest orders via{' '}
                    <code className="font-mono">/api/ingest/shipments</code> or create one manually.
                  </td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-white">{s.orderCode}</div>
                      <div className="font-mono text-[11px] text-zinc-400">{s.shipmentId}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                      {s.originCode} → {s.destCode} ({s.destCity})
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                      {s.driver?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          s.status === 'IN TRANSIT'
                            ? 'text-[#6F8E11] dark:text-[#C4E854]'
                            : s.status === 'DELIVERED'
                              ? 'text-emerald-500'
                              : 'text-zinc-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-900 dark:text-white">
                      {s.progressPct}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenTracking(s)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] hover:bg-[#C4E854] hover:text-[#0B0C0E] font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'customers') {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Enterprise Accounts</p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Customers</h1>
        </div>
        {customers.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-8 text-center space-y-2">
            <Users className="w-6 h-6 mx-auto text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No enterprise customer profiles yet
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Push customer accounts through <code className="font-mono">POST /api/ingest/customers</code>{' '}
              to sync your CRM or ERP directory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customers.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#C4E854]/15 text-[#6F8E11] dark:text-[#C4E854] flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {c.company}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{c.name}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#6F8E11] dark:text-[#C4E854]">
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pt-1">
                  <div>{c.email}</div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {c.city}
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white tabular-nums">
                      {c.totalShipments} shipments
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'help') {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Documentation &amp; Operations</p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              Help &amp; Support
            </h1>
          </div>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-xs font-semibold"
          >
            <span>Open Swagger API Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-5 space-y-2">
            <Truck className="w-5 h-5 text-[#6F8E11] dark:text-[#C4E854]" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Real-Time Socket.IO &amp; External Ingest API
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              External telematics, ERP, or GPS trackers push updates to{' '}
              <code className="font-mono">/api/ingest/*</code> authenticated via{' '}
              <code className="font-mono">X-API-Key</code>. Every ingested update immediately
              broadcasts to connected browsers over Socket.IO.
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-5 space-y-2">
            <Package className="w-5 h-5 text-[#6F8E11] dark:text-[#C4E854]" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              CLI Simulation &amp; Operator Auth
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Generate an Ingest API key in Settings, then run{' '}
              <code className="font-mono">INGEST_API_KEY=... npm run simulate</code> in your
              terminal to stream live telemetry into PostgreSQL and Google Maps.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Settings
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Workspace Configuration</p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
          >
            <span>OpenAPI JSON</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-xs font-semibold"
          >
            <span>Swagger UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#6F8E11] dark:text-[#C4E854]" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Account &amp; Session (User Auth)
            </h2>
          </div>
          {user ? (
            <div className="space-y-2 text-xs">
              <div className="text-zinc-900 dark:text-white font-semibold">{user.name}</div>
              <div className="text-zinc-500 dark:text-zinc-400">{user.email}</div>
              <div className="text-zinc-500 dark:text-zinc-400">
                {user.organization} · {user.subscriptionPlan}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="mt-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-500 font-semibold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sign in or register an operator account to manage shipments and External Ingest API
                keys.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-[#C4E854] text-[#0B0C0E] text-xs font-semibold cursor-pointer"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#6F8E11] dark:text-[#C4E854]" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Database, Maps &amp; Socket.IO
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-[#C4E854] shrink-0" />
            <span>
              ORM: Drizzle ORM (
              {storageMode === 'postgres'
                ? 'PostgreSQL Connected'
                : 'Preview Memory Mode — set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in Secrets'}
              )
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure <code className="font-mono">DB_HOST</code>,{' '}
            <code className="font-mono">DB_PORT</code>,{' '}
            <code className="font-mono">DB_NAME</code>,{' '}
            <code className="font-mono">DB_USER</code>,{' '}
            <code className="font-mono">DB_PASSWORD</code>,{' '}
            <code className="font-mono">INGEST_API_KEY</code>, and{' '}
            <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in environment secrets.
          </p>
        </div>

        {/* External Ingest API Keys */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-[#6F8E11] dark:text-[#C4E854]" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  External Ingest API Keys
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Separate machine-to-machine authentication for{' '}
                  <code className="font-mono">/api/ingest/*</code> endpoints via{' '}
                  <code className="font-mono">X-API-Key</code> header.
                </p>
              </div>
            </div>
            {user && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300">
                Env Master Key: {envKeyConfigured ? 'Configured' : 'Not set'}
              </span>
            )}
          </div>

          {!user ? (
            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-black/20 p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Sign in with an operator account to issue or revoke Ingest API keys.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3.5 py-2 rounded-xl bg-[#C4E854] text-[#0B0C0E] text-xs font-semibold cursor-pointer"
              >
                Sign In to Manage Keys
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleCreateApiKey} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key label (e.g. GPS Fleet Gateway / Simulator)"
                  className="flex-1 min-w-[220px] rounded-xl bg-zinc-100 dark:bg-[#191B20] border border-zinc-200 dark:border-white/[0.08] px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#C4E854]"
                />
                <button
                  type="submit"
                  disabled={creatingKey || !newKeyName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] disabled:opacity-50 text-[#0B0C0E] text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creatingKey ? 'Generating...' : 'Generate API Key'}</span>
                </button>
              </form>

              {keysError && (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {keysError}
                </div>
              )}

              {createdRawKey && (
                <div className="rounded-xl border border-[#82A818]/40 dark:border-[#C4E854]/40 bg-[#C4E854]/10 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#5E7C0A] dark:text-[#C4E854]">
                      Copy this API key now — it will not be shown again
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyKey(createdRawKey)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C4E854] text-[#0B0C0E] text-[11px] font-semibold cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs break-all bg-black/10 dark:bg-black/40 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100">
                    {createdRawKey}
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300 font-mono break-all">
                    INGEST_API_KEY=&quot;{createdRawKey}&quot; npm run simulate
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[540px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-[11px] uppercase tracking-wider text-zinc-400">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Prefix</th>
                      <th className="py-2.5 px-3">Last Used</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05] text-xs">
                    {keysLoading ? (
                      <tr>
                        <td colSpan={5} className="py-5 px-3 text-center text-zinc-400">
                          Loading API keys...
                        </td>
                      </tr>
                    ) : apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-5 px-3 text-center text-zinc-500 dark:text-zinc-400">
                          No database API keys generated yet. Generate one above or set{' '}
                          <code className="font-mono">INGEST_API_KEY</code> in Secrets.
                        </td>
                      </tr>
                    ) : (
                      apiKeys.map((k) => (
                        <tr key={k.id}>
                          <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-white">
                            {k.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-500 dark:text-zinc-400">
                            {k.prefix}...
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 tabular-nums">
                            {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 tabular-nums">
                            {new Date(k.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRevokeApiKey(k.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-500 hover:bg-red-500/10 font-medium cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

