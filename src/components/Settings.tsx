import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, LogOut } from 'lucide-react';
import { AppUser, clearSession, getUser, setUser } from '../lib/localData';

export default function Settings() {
  const [user, setLocalUser] = useState<AppUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const current = getUser();
    if (current) {
      setLocalUser(current);
      setDisplayName(current.name);
    }
  }, []);

  const handleSave = () => {
    if (!user) return;

    const updated = {
      ...user,
      name: displayName.trim() || user.name,
    };

    setUser(updated);
    setLocalUser(updated);
    alert('Profile updated');
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-500">No user is signed in.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 text-[var(--foreground)] transition-colors duration-300">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Settings2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        </div>
        <p className="text-[var(--muted-foreground)] ml-11">Manage your account preferences and application appearance.</p>
      </header>

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-xl">Profile Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--muted-foreground)] ml-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--muted-foreground)] ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full px-4 py-3 bg-[var(--secondary)] border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] cursor-not-allowed font-medium"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all font-bold text-sm"
          >
            Save Changes
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center gap-2 font-bold text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
