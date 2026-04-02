import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ThreadDetail from './components/ThreadDetail';
import Sidebar from './components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-neutral-50 text-neutral-900 font-sans">
        {user && <Sidebar user={user} />}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/thread/:id" element={user ? <ThreadDetail /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
