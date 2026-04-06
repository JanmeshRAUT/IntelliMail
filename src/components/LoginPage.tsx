import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AppUser, setAccessToken, setUser } from '../lib/localData';
import {
  fetchGoogleUserProfile,
  loadGoogleIdentityScript,
  requestGoogleAccessToken,
} from '../lib/googleAuth';

interface LoginPageProps {
  onLogin: (user: AppUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    loadGoogleIdentityScript().catch((scriptError) => {
      console.error(scriptError);
      setError('Failed to load Google OAuth script. Refresh and try again.');
    });
  }, []);

  const handleGoogleLogin = async () => {
    if (!clientId) {
      setError('Missing VITE_GOOGLE_CLIENT_ID. Set it in .env and restart dev server.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const tokenResponse = await requestGoogleAccessToken({
        clientId,
        prompt: 'consent',
      });

      if (!tokenResponse.access_token) {
        throw new Error('Missing OAuth token from Google.');
      }

      const profile = await fetchGoogleUserProfile(tokenResponse.access_token);
      if (!profile.sub || !profile.email) {
        throw new Error('Google profile is missing required fields.');
      }

      const user: AppUser = {
        name: profile.name || profile.email,
        email: profile.email,
        avatar: profile.picture,
      };

      setAccessToken(tokenResponse.access_token, tokenResponse.expires_in);
      setUser(user);
      onLogin(user);
      navigate('/');
    } catch (oauthError) {
      console.error('Google OAuth processing failed:', oauthError);
      setError('Google login failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-600/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full text-center space-y-10 relative z-10"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="p-5 bg-primary-600 rounded-[2.5rem] shadow-2xl shadow-primary-500/40 border-4 border-white/10"
            >
              <Mail className="w-14 h-14 text-white" />
            </motion.div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tighter">IntelliMail</h1>
            <p className="text-[var(--muted-foreground)] text-lg font-medium">Advanced Gmail Intelligence & Synthesis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-[var(--card)] text-left border border-[var(--border)] shadow-xl shadow-black/5 group hover:border-primary-500/30 transition-all">
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <Zap className="w-6 h-6 text-yellow-500 shrink-0 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--foreground)]">Contextual Synthesis</h3>
              <p className="text-sm text-[var(--muted-foreground)] font-medium leading-relaxed">AI-driven grouping and intelligent conversation summaries.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-[var(--card)] text-left border border-[var(--border)] shadow-xl shadow-black/5 group hover:border-primary-500/30 transition-all">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--foreground)]">Proactive Defense</h3>
              <p className="text-sm text-[var(--muted-foreground)] font-medium leading-relaxed">Real-time threat detection and behavioral security analysis.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 px-8 py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-black/10 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            {!loading && (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {loading ? 'Authenticating...' : 'Sign in with Google'}
          </button>

          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 text-center"
            >
              {error}
            </motion.p>
          )}
          
          <p className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest opacity-60">
            Enterprise-grade OAuth 2.0 Security
          </p>
        </div>
      </motion.div>
    </div>
  );
}
