import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  HelpCircle,
  LayoutDashboard,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  X,
} from 'lucide-react';
import type { AuthUser, NavTab } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadInboxCount: number;
  user: AuthUser | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenUpgradeModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  unreadInboxCount,
  user,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenUpgradeModal,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const primaryNav: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracking', label: 'Tracking', icon: Truck },
    { id: 'inbox', label: 'Inbox', icon: Mail, badge: unreadInboxCount > 0 ? unreadInboxCount : undefined },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  const secondaryNav: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const displayName = user?.name || 'Sohan Talukder';
  const displayTitle = user?.title || 'Founder of JalurKargo';
  const avatarSrc = user?.avatarUrl || '/src/assets/images/avatar_manager_1795325384322.jpg';

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0D0E11] border-r border-zinc-200 dark:border-white/[0.08] select-none">
      {/* User Profile Row */}
      <div className={`px-4 pt-4 pb-3 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={avatarSrc}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-white/15 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-zinc-900 dark:text-white truncate">
                {displayName}
              </div>
              <div className="text-[11.5px] text-zinc-500 dark:text-zinc-400 truncate">
                {displayTitle}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Box */}
      {!collapsed && (
        <div className="px-4 py-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              aria-label="Global sidebar search"
              className="w-full h-9 pl-9 pr-12 rounded-xl bg-zinc-100 dark:bg-[#191B20] border border-zinc-200 dark:border-white/[0.06] text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#C4E854]/60 transition-colors"
            />
            <span className="absolute right-2.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 pointer-events-none">
              ⌘K
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-[13.5px] font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#C4E854]/22 via-[#C4E854]/8 to-transparent text-zinc-950 dark:text-[#C4E854] border border-[#C4E854]/30 shadow-[0_0_16px_rgba(196,232,84,0.08)]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-[17px] h-[17px] shrink-0 ${
                    active ? 'text-[#6F8E11] dark:text-[#C4E854]' : 'text-zinc-400'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
              {!collapsed && item.badge !== undefined && (
                <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-300 tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="my-3 border-t border-zinc-200 dark:border-white/[0.07]" />

        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3'
              } py-2.5 rounded-xl text-[13.5px] font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#C4E854]/22 via-[#C4E854]/8 to-transparent text-zinc-950 dark:text-[#C4E854] border border-[#C4E854]/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon
                className={`w-[17px] h-[17px] shrink-0 ${
                  active ? 'text-[#6F8E11] dark:text-[#C4E854]' : 'text-zinc-400'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Free Trial Promo Card */}
      {!collapsed && (
        <div className="p-3.5 mt-auto">
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#131519] border border-zinc-200 dark:border-white/[0.08] p-3.5 overflow-hidden">
            <div className="w-full h-24 rounded-xl bg-[#141619] overflow-hidden mb-3 flex items-center justify-center">
              <img
                src="/src/assets/images/promo_truck_3d_1795325384265.jpg"
                alt="JalurKargo Pro Fleet Illustration"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-105"
              />
            </div>

            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                Free trial
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                {user?.trialDaysLeft ?? 7} days left
              </span>
            </div>

            <p className="text-[11.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mb-3.5">
              Advanced analytics and complete logistics management
            </p>

            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="w-full py-2.5 px-4 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] text-[#0B0C0E] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="tabular-nums">$15.00/month</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          collapsed ? 'w-[74px]' : 'w-[248px]'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[264px] max-w-[85vw] h-full z-10">{content}</div>
        </div>
      )}
    </>
  );
};
