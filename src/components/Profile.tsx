import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pencil, LogOut } from 'lucide-react';
import { AppUser, clearSession, getUser, setUser } from '../lib/localData';

export default function Profile() {
  const [user, setLocalUser] = useState<AppUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const current = getUser();
    if (current) {
      setLocalUser(current);
      setDisplayName(current.name);
      setEmail(current.email);
      setJobTitle(current.jobTitle ?? '');
      setCompany(current.company ?? '');
      setPhone(current.phone ?? '');
    }
  }, []);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSave = () => {
    if (!user) return;

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      alert('Please enter your name.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      alert('Invalid email format.');
      return;
    }

    const updatedUser: AppUser = {
      ...user,
      name: trimmedName,
      email: trimmedEmail,
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      phone: phone.trim(),
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
          <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
            <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Professional Profile</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Keep your contact and organizational data accurate.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Full Name</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!isEditing}
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--border)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Email</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditing}
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--border)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Job Title</p>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={!isEditing}
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--border)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Company</p>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={!isEditing}
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--border)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-[var(--muted-foreground)]">Phone</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isEditing}
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--border)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
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
