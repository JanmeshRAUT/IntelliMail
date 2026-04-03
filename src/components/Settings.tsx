import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, LogOut } from 'lucide-react';
import { AppUser, clearSession, getUser, setUser } from '../lib/localData';

type SettingsState = {
  emailPreviews: boolean;
  desktopNotifications: boolean;
  autoSorting: boolean;
  twoFactorEnabled: boolean;
};

const SETTINGS_KEY = 'intellimail_settings';

function readSettings(): SettingsState {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return {
      emailPreviews: true,
      desktopNotifications: false,
      autoSorting: true,
      twoFactorEnabled: false,
    };
  }

  try {
    return JSON.parse(raw) as SettingsState;
  } catch {
    return {
      emailPreviews: true,
      desktopNotifications: false,
      autoSorting: true,
      twoFactorEnabled: false,
    };
  }
}

function writeSettings(settings: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const [user, setLocalUser] = useState<AppUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [settings, setSettings] = useState<SettingsState>(readSettings());
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
    writeSettings(settings);
    alert('All changes saved securely to your profile.');
  };

  const handleToggle = (key: keyof SettingsState) => {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] };
      writeSettings(next);
      return next;
    });
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
        <p className="text-[var(--muted-foreground)] ml-11">Manage account security and workflow preferences.</p>
      </header>

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-xl">General Preferences</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)]">
            <span className="font-medium text-[var(--foreground)]">Email previews</span>
            <input type="checkbox" className="h-5 w-5" checked={settings.emailPreviews} onChange={() => handleToggle('emailPreviews')} />
          </label>

          <label className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)]">
            <span className="font-medium text-[var(--foreground)]">Desktop notifications</span>
            <input type="checkbox" className="h-5 w-5" checked={settings.desktopNotifications} onChange={() => handleToggle('desktopNotifications')} />
          </label>

          <label className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)]">
            <span className="font-medium text-[var(--foreground)]">Auto-sorting rules</span>
            <input type="checkbox" className="h-5 w-5" checked={settings.autoSorting} onChange={() => handleToggle('autoSorting')} />
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
          <p className="text-sm text-[var(--muted-foreground)]">
            {settings.twoFactorEnabled
              ? 'Two-factor authentication is enabled for your account.'
              : 'Two-factor authentication is currently disabled.'}
          </p>
          <button
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold hover:bg-[var(--secondary)] transition-all"
              onClick={() => handleToggle('twoFactorEnabled')}
          >
            {settings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </section>

      <div className="flex justify-between">
        <button onClick={handleSave} className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all">Save changes</button>
        <button onClick={handleLogout} className="px-5 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">Log out</button>
      </div>
    </div>
  );
}
