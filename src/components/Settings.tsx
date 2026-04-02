import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, LogOut, Moon, Sun } from 'lucide-react';
import { AppUser, clearSession, getUser, setUser } from '../lib/localData';

export default function Settings() {
  const [user, setLocalUser] = useState<AppUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const navigate = useNavigate();

  useEffect(() => {
    const current = getUser();
    if (current) {
      setLocalUser(current);
      setDisplayName(current.name);
    }

    const savedTheme = localStorage.getItem('intellimail_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
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

  const handleThemeToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('intellimail_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
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
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <Settings2 className="w-6 h-6 text-blue-600" />
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
      </header>

      <section className="bg-white border border-neutral-200 rounded-2xl p-6">
        <h2 className="font-semibold text-lg text-neutral-900 mb-4">Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm text-neutral-700">
            Display Name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </label>
          <label className="space-y-1 text-sm text-neutral-700">
            Email (readonly)
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Save profile
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </section>

      <section className="bg-white border border-neutral-200 rounded-2xl p-6">
        <h2 className="font-semibold text-lg text-neutral-900 mb-4">Appearance</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleThemeToggle}
            className="px-4 py-2 rounded-lg border border-neutral-200 hover:border-blue-300 flex items-center gap-2"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          </button>
        </div>
      </section>
    </div>
  );
}
