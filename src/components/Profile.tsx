import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pencil, LogOut } from 'lucide-react';
import { AppUser, clearSession, getUser, setUser } from '../lib/localData';

export default function Profile() {
  const [user, setLocalUser] = useState<AppUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const current = getUser();
    if (current) {
      setLocalUser(current);
      setDisplayName(current.name);
      setEmail(current.email);
    }
  }, []);

  const handleSave = () => {
    if (!user) return;
    const updatedUser: AppUser = {
      ...user,
      name: displayName.trim() || user.name,
      email,
    };
    setUser(updatedUser);
    setLocalUser(updatedUser);
    setIsEditing(false);
    alert('Profile saved successfully');
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--muted-foreground)]">No profile found. Please login first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-[var(--foreground)] transition-colors duration-300">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Update your account information and preferences.</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium bg-[var(--secondary)] dark:bg-[var(--muted)] text-[var(--foreground)]"
        >
          <Pencil className="w-4 h-4" />
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </header>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Name</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!isEditing}
              className="mt-1 w-full md:w-80 px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--border)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Email</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditing}
              className="mt-1 w-full md:w-80 px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--border)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all">Save</button>
            <button onClick={() => setIsEditing(false)} className="px-5 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--secondary)] transition-all">Discard</button>
          </div>
        )}

        <div className="pt-4 border-t border-[var(--border)]">
          <button onClick={handleLogout} className="px-5 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
            <LogOut className="w-4 h-4 inline mr-2" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}
