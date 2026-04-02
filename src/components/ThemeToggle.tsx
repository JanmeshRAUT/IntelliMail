import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('intellimail_theme');
    const resolvedTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
    setTheme(resolvedTheme);
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('intellimail_theme', next);
    // Dispatch a custom event to notify other components if needed
    window.dispatchEvent(new Event('intellimail:theme-changed'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl hover:border-primary-500 transition-all group flex items-center justify-center backdrop-blur-md bg-opacity-80"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-slate-700 group-hover:text-primary-600 transition-colors" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
      )}
    </button>
  );
}
