import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import AlertsPanel from './components/AlertsPanel';
import { Loader2 } from 'lucide-react';
import { AppUser, getUser } from './lib/localData';

const LoginPage = lazy(() => import('./components/LoginPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ThreadDetail = lazy(() => import('./components/ThreadDetail'));
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));
const Profile = lazy(() => import('./components/Profile'));
const SecurityReportPage = lazy(() => import('./components/SecurityReportPage'));

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const routeFallback = (
    <div className="flex items-center justify-center h-full min-h-[320px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );

  useEffect(() => {
    setUser(getUser());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased selection:bg-primary-100 selection:text-primary-900 transition-colors duration-300">
        <div className="fixed top-6 right-8 z-[100] flex items-center gap-4">
          <AlertsPanel />
          <ThemeToggle />
        </div>
        {user && <Sidebar user={user} onLogout={() => setUser(null)} />}
        <main className="flex-1 overflow-auto relative">
          <Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/login" element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/thread/:id" element={user ? <ThreadDetail /> : <Navigate to="/login" />} />
              <Route path="/analytics" element={user ? <Analytics /> : <Navigate to="/login" />} />
              <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
              <Route path="/security-report/:threadId" element={user ? <SecurityReportPage /> : <Navigate to="/login" />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
