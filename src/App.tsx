import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { DriverStatsPanel } from './components/DriverStatsPanel';
import { FleetMapPanel } from './components/FleetMapPanel';
import { SecondaryViews } from './components/SecondaryViews';
import { NewShipmentModal, ShipmentDetailModal } from './components/ShipmentModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TrackingList } from './components/TrackingList';
import { api, setAuthToken } from './lib/api';
import { createFleetSocket } from './lib/socket';
import type {
  AuthUser,
  CustomerItem,
  DriverStatItem,
  InboxMessageItem,
  NavTab,
  ShipmentItem,
  ShipmentStatus,
  TelemetryUpdatePayload,
} from './types';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('tracking');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [storageMode, setStorageMode] = useState<'postgres' | 'memory'>('postgres');

  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [stats, setStats] = useState<DriverStatItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [inboxMessages, setInboxMessages] = useState<InboxMessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShipmentStatus>('ALL');
  const [activeShippingOnly, setActiveShippingOnly] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [newShipmentOpen, setNewShipmentOpen] = useState(false);
  const [detailShipment, setDetailShipment] = useState<ShipmentItem | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [healthRes, shipmentsRes, statsRes, customersRes, inboxRes] = await Promise.all([
        api.health(),
        api.getShipments(),
        api.getStats(),
        api.getCustomers(),
        api.getInbox(),
      ]);
      setStorageMode(healthRes.storage);
      setShipments(shipmentsRes.shipments);
      setStats(statsRes.stats);
      setCustomers(customersRes.customers);
      setInboxMessages(inboxRes.messages);
      if (shipmentsRes.shipments.length > 0) {
        setSelectedId((prev) => prev ?? shipmentsRes.shipments[0].id);
      }
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Real-time Socket.IO synchronization
  useEffect(() => {
    const socket = createFleetSocket();

    socket.on('connect', () => {
      loadWorkspaceData();
    });

    socket.on('shipment:upserted', (incoming: ShipmentItem) => {
      setShipments((prev) => {
        const exists = prev.some((s) => s.id === incoming.id);
        if (exists) {
          return prev.map((s) => (s.id === incoming.id ? incoming : s));
        }
        return [incoming, ...prev];
      });
      setSelectedId((prev) => prev ?? incoming.id);
      setDetailShipment((prev) => (prev && prev.id === incoming.id ? incoming : prev));
    });

    socket.on('shipment:deleted', ({ id }: { id: number }) => {
      setShipments((prev) => prev.filter((s) => s.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
      setDetailShipment((prev) => (prev && prev.id === id ? null : prev));
    });

    socket.on('telemetry:updated', (payload: TelemetryUpdatePayload) => {
      setShipments((prev) =>
        prev.map((s) =>
          s.id === payload.id
            ? {
                ...s,
                currentLat: payload.currentLat,
                currentLng: payload.currentLng,
                progressPct: payload.progressPct,
                status: payload.status,
                dropoffEta: payload.dropoffEta,
              }
            : s
        )
      );
      setDetailShipment((prev) =>
        prev && prev.id === payload.id
          ? {
              ...prev,
              currentLat: payload.currentLat,
              currentLng: payload.currentLng,
              progressPct: payload.progressPct,
              status: payload.status,
              dropoffEta: payload.dropoffEta,
            }
          : prev
      );
    });

    socket.on('stats:updated', (incoming: DriverStatItem) => {
      setStats((prev) => {
        const idx = prev.findIndex((st) => st.timeframe === incoming.timeframe);
        if (idx >= 0) {
          return prev.map((st) => (st.timeframe === incoming.timeframe ? incoming : st));
        }
        return [...prev, incoming];
      });
    });

    socket.on('customer:upserted', (incoming: CustomerItem) => {
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.id === incoming.id || c.email === incoming.email);
        if (idx >= 0) {
          return prev.map((c, i) => (i === idx ? incoming : c));
        }
        return [incoming, ...prev];
      });
    });

    socket.on('inbox:received', (incoming: InboxMessageItem) => {
      setInboxMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
    });

    socket.on('inbox:updated', (incoming: InboxMessageItem) => {
      setInboxMessages((prev) => prev.map((m) => (m.id === incoming.id ? incoming : m)));
    });

    return () => {
      socket.disconnect();
    };
  }, [loadWorkspaceData]);

  const filteredShipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter((s) => {
      const effectiveStatus = activeShippingOnly ? 'IN TRANSIT' : statusFilter;
      const matchesStatus = effectiveStatus === 'ALL' || s.status === effectiveStatus;
      const matchesQuery =
        !q ||
        s.orderCode.toLowerCase().includes(q) ||
        s.trackingRef.toLowerCase().includes(q) ||
        s.shipmentId.toLowerCase().includes(q) ||
        s.originCode.toLowerCase().includes(q) ||
        s.originCity.toLowerCase().includes(q) ||
        s.destCode.toLowerCase().includes(q) ||
        s.destCity.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [shipments, searchQuery, statusFilter, activeShippingOnly]);

  const selectedShipment = useMemo(
    () =>
      filteredShipments.find((s) => s.id === selectedId) ??
      shipments.find((s) => s.id === selectedId) ??
      filteredShipments[0] ??
      null,
    [filteredShipments, shipments, selectedId]
  );

  const unreadInboxCount = useMemo(
    () => inboxMessages.filter((m) => m.unread).length,
    [inboxMessages]
  );

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const handleMarkMessageRead = async (id: number) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await api.markMessageRead(id);
      setInboxMessages((prev) => prev.map((m) => (m.id === id ? res.message : m)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F4F5F7] dark:bg-[#0B0C0E] text-zinc-900 dark:text-[#F4F5F6] overflow-x-hidden lg:overflow-hidden">
      {/* Top Bar */}
      <TopBar
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        activeShippingOnly={activeShippingOnly}
        onToggleActiveShipping={() => setActiveShippingOnly((v) => !v)}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        inboxMessages={inboxMessages}
        onSelectNotifications={() => setActiveTab('inbox')}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadInboxCount={unreadInboxCount}
          user={user}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
        />

        {activeTab === 'tracking' ? (
          <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 p-4 lg:p-5 min-w-0 min-h-0 overflow-y-auto lg:overflow-hidden">
            {/* Middle Column: Tracking List */}
            <TrackingList
              shipments={filteredShipments}
              selectedId={selectedShipment?.id ?? null}
              onSelectShipment={(s) => setSelectedId(s.id)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onOpenNewShipment={() => setNewShipmentOpen(true)}
              loading={loading}
            />

            {/* Right Column: Live Map + Driver Statistics */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
              <FleetMapPanel
                shipments={shipments}
                selectedShipment={selectedShipment}
                onSelectShipment={(s) => setSelectedId(s.id)}
                onOpenShipmentDetail={(s) => setDetailShipment(s)}
                onOpenInbox={() => setActiveTab('inbox')}
                isDark={isDark}
              />

              <DriverStatsPanel
                stats={stats}
                onExpandClick={() => setActiveTab('dashboard')}
              />
            </div>
          </main>
        ) : (
          <SecondaryViews
            activeTab={activeTab}
            shipments={shipments}
            customers={customers}
            inboxMessages={inboxMessages}
            stats={stats}
            user={user}
            storageMode={storageMode}
            onOpenTracking={(s) => {
              if (s) setSelectedId(s.id);
              setActiveTab('tracking');
            }}
            onOpenNewShipment={() => setNewShipmentOpen(true)}
            onMarkMessageRead={handleMarkMessageRead}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Modals */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(u) => setUser(u)}
      />

      <NewShipmentModal
        open={newShipmentOpen}
        onClose={() => setNewShipmentOpen(false)}
        onCreated={(created) => {
          setShipments((prev) =>
            prev.some((s) => s.id === created.id)
              ? prev.map((s) => (s.id === created.id ? created : s))
              : [created, ...prev]
          );
          setSelectedId(created.id);
          setActiveTab('tracking');
        }}
        isAuthenticated={Boolean(user)}
        onRequireAuth={() => {
          setNewShipmentOpen(false);
          setAuthModalOpen(true);
        }}
      />

      <ShipmentDetailModal
        shipment={detailShipment}
        onClose={() => setDetailShipment(null)}
        onUpdated={(updated) => {
          setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        }}
        onDeleted={(deletedId) => {
          setShipments((prev) => prev.filter((s) => s.id !== deletedId));
          if (selectedId === deletedId) {
            setSelectedId(null);
          }
        }}
        isAuthenticated={Boolean(user)}
        onRequireAuth={() => {
          setDetailShipment(null);
          setAuthModalOpen(true);
        }}
      />

      {/* Pro Plan Upgrade Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/10 shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(false)}
              aria-label="Close upgrade modal"
              className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6F8E11] dark:text-[#C4E854]">
              JalurKargo Pro Plan
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
              $15.00/month · Scaling Operations
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Full multi-region fleet telemetry, unlimited waypoints, and automated dispatch logs.
            </p>
            <ul className="mt-4 space-y-2.5 text-xs text-zinc-700 dark:text-zinc-200">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#C4E854]" /> Up to 250 active vehicles on Google Maps
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#C4E854]" /> PostgreSQL historical route retention
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#C4E854]" /> Real-time driver ETA &amp; sorting alerts
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-sm font-semibold cursor-pointer"
            >
              Continue Free Trial ({user?.trialDaysLeft ?? 7} days left)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
