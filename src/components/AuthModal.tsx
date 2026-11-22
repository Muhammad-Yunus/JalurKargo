import React, { useEffect, useState } from 'react';
import { Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';
import type { AuthUser } from '../types';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [hasUsers, setHasUsers] = useState(true);
  const [storageMode, setStorageMode] = useState<'postgres' | 'memory'>('postgres');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('Founder of JalurKargo');
  const [organization, setOrganization] = useState('JalurKargo.id');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api
      .authStatus()
      .then((res) => {
        setHasUsers(res.hasUsers);
        setStorageMode(res.storage);
        if (!res.hasUsers) {
          setMode('register');
        }
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === 'register'
          ? await api.register({ name, email, password, title, organization })
          : await api.login({ email, password });

      setAuthToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/10 shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#C4E854] text-[#0B0C0E] flex items-center justify-center font-extrabold text-sm">
            JK
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {mode === 'register' ? 'Create Fleet Account' : 'Sign In to JalurKargo'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {storageMode === 'postgres'
                ? 'PostgreSQL + Drizzle authenticated session'
                : 'Workspace session (set DB_HOST, DB_USER, DB_PASSWORD in Secrets for PostgreSQL)'}
            </p>
          </div>
        </div>

        {!hasUsers && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#C4E854]/12 border border-[#C4E854]/30 text-xs text-[#6F8E11] dark:text-[#C4E854] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>No users registered yet. Create the first founder/admin account below.</span>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#1A1D22] mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-[#262A32] text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-[#262A32] text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sohan Talukder"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#C4E854]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#C4E854]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#C4E854]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@jalurkargo.id"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#C4E854]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-50 dark:bg-[#1A1D22] border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#C4E854]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#C4E854] hover:bg-[#d2f26b] disabled:opacity-60 text-[#0B0C0E] font-semibold text-sm transition-colors cursor-pointer"
          >
            {loading
              ? 'Authenticating...'
              : mode === 'register'
                ? 'Create Account & Sign In'
                : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
