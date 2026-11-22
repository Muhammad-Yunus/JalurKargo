import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Calendar,
  ChevronDown,
  Clock,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Radio,
  Sun,
  UserCheck,
} from 'lucide-react';
import type { AuthUser, InboxMessageItem } from '../types';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  activeShippingOnly: boolean;
  onToggleActiveShipping: () => void;
  user: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  inboxMessages: InboxMessageItem[];
  onSelectNotifications: () => void;
  onOpenMobileSidebar: () => void;
}

const DATE_OPTIONS = ['December 24', 'December 25', 'December 26', 'Today (Live)'];

export const TopBar: React.FC<TopBarProps> = ({
  isDark,
  onToggleTheme,
  activeShippingOnly,
  onToggleActiveShipping,
  user,
  onOpenAuth,
  onLogout,
  inboxMessages,
  onSelectNotifications,
  onOpenMobileSidebar,
}) => {
  const [selectedDate, setSelectedDate] = useState('December 24');
  const [dateOpen, setDateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [timeText, setTimeText] = useState('06:18 AM');

  const dateRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => {
      if (selectedDate === 'Today (Live)') {
        const now = new Date();
        setTimeText(
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        );
      } else {
        setTimeText('06:18 AM');
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, [selectedDate]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const unreadCount = inboxMessages.filter((m) => m.unread).length;

  return (
    <header className="h-[64px] shrink-0 border-b border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#0B0C0E] px-4 lg:px-6 flex items-center justify-between gap-4 z-30">
      {/* Left Zone: Mobile toggle + Brand + Active Shipping Status */}
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>

        <span className="text-[21px] font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0">
          JalurKargo
        </span>

        <button
          type="button"
          onClick={onToggleActiveShipping}
          title="Filter active shipments"
          className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium tracking-wider uppercase transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeShippingOnly
              ? 'bg-[#C4E854]/15 border-[#C4E854]/50 text-[#6F8E11] dark:text-[#C4E854]'
              : 'bg-zinc-100 dark:bg-[#14161A] border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/20'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${activeShippingOnly ? 'text-[#C4E854]' : 'text-zinc-400'}`} />
          <span>ACTIVE SHIPPING</span>
        </button>
      </div>

      {/* Right Zone: Clock/Date + Theme Switch + Notification Bell + Account Switcher */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        {/* Time & Date selector */}
        <div
          ref={dateRef}
          className="relative hidden md:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-[#131519] border border-zinc-200 dark:border-white/[0.08] text-[13px] text-zinc-700 dark:text-zinc-200"
        >
          <div className="flex items-center gap-2 tabular-nums whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-medium">{timeText}</span>
          </div>
          <span className="h-3.5 w-px bg-zinc-300 dark:bg-white/10" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setDateOpen((v) => !v)}
            className="flex items-center gap-2 hover:text-zinc-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-medium">{selectedDate}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {dateOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-44 rounded-xl bg-white dark:bg-[#16181D] border border-zinc-200 dark:border-white/10 shadow-xl py-1.5 z-50">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSelectedDate(opt);
                    setDateOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    selectedDate === opt
                      ? 'text-[#6F8E11] dark:text-[#C4E854] bg-[#C4E854]/10'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Switch (Moon / Sun) */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-100 dark:bg-[#131519] border border-zinc-200 dark:border-white/[0.08] cursor-pointer"
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-[#262A31] text-white' : 'text-zinc-400'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </span>
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              !isDark ? 'bg-white text-amber-500 shadow-sm' : 'text-zinc-500'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </span>
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-[#131519] border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/20 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-80 rounded-2xl bg-white dark:bg-[#16181D] border border-zinc-200 dark:border-white/10 shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-200 dark:border-white/10">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                  Dispatch Alerts
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    onSelectNotifications();
                  }}
                  className="text-[11px] font-medium text-[#6F8E11] dark:text-[#C4E854] hover:underline cursor-pointer"
                >
                  Open Inbox
                </button>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-white/[0.06] max-h-64 overflow-y-auto">
                {inboxMessages.length === 0 ? (
                  <div className="py-6 px-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    No dispatch alerts yet
                  </div>
                ) : (
                  inboxMessages.slice(0, 3).map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onSelectNotifications();
                      }}
                      className="w-full text-left py-2.5 px-1.5 hover:bg-zinc-50 dark:hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
                          {msg.timeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                        {msg.subject}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Organization / Account Switcher */}
        <div ref={accountRef} className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#131519] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-[#0B0C0E] font-extrabold text-[11px] flex items-center justify-center shrink-0">
              JK
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[12px] font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                {user ? user.organization : 'JalurKargo.id'}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {user ? user.subscriptionPlan : 'Pro Subscription'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl bg-white dark:bg-[#16181D] border border-zinc-200 dark:border-white/10 shadow-2xl p-2 z-50">
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
                      <UserCheck className="w-3.5 h-3.5 text-[#C4E854]" />
                      <span className="truncate">{user.name}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      onLogout();
                    }}
                    className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="p-1">
                  <p className="px-2 py-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Sign in to create or update fleet shipments in PostgreSQL.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-[#C4E854] text-[#0B0C0E] hover:bg-[#d2f06d] transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
