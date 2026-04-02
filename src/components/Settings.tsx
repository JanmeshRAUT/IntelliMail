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
          <h2 className="font-bold text-xl">General Preferences</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)]">
            <span className="font-medium text-[var(--foreground)]">Email previews</span>
            <input type="checkbox" className="h-5 w-5" checked />
          </label>

          <label className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)]">
            <span className="font-medium text-[var(--foreground)]">Desktop notifications</span>
            <input type="checkbox" className="h-5 w-5" />
          </label>

          <label className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)]">
            <span className="font-medium text-[var(--foreground)]">Auto-sorting rules</span>
            <input type="checkbox" className="h-5 w-5" checked />
          </label>
        </div>

        <div className="pt-4 border-t border-[var(--border)]">
          <h3 className="text-sm text-[var(--muted-foreground)]">Theme</h3>
          <p className="text-xs text-[var(--muted-foreground)]">Use the theme toggle button in the header to switch Light/Dark modes.</p>
        </div>
      </section>

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
        <h2 className="font-bold text-xl mb-4">Security</h2>
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">Two-factor authentication is not yet enabled.</p>
          <button className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold hover:bg-[var(--secondary)] transition-all">Enable 2FA</button>
        </div>
      </section>
    </div>
  );
}
