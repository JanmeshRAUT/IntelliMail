import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, Zap, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 transition-colors duration-500 relative overflow-hidden">
      {/* Animated premium background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary-500/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-primary-400 rounded-full shadow-[0_0_100px_40px_rgba(14,140,233,0.15)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full text-center space-y-12 relative z-10"
      >
        <div className="space-y-8">
          <div className="flex justify-center">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="p-6 gradient-primary rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(2,109,198,0.5)] border-4 border-white/20 relative group"
            >
              <div className="absolute inset-0 bg-white/20 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              <Mail className="w-16 h-16 text-white relative z-10" />
            </motion.div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-7xl font-extrabold tracking-tightest bg-clip-text text-transparent bg-gradient-to-b from-[var(--foreground)] to-[var(--foreground)]/60">
              IntelliMail
            </h1>
            <p className="text-xl text-[var(--muted-foreground)] font-medium max-w-sm mx-auto leading-relaxed">
              Experience the next generation of <span className="text-[var(--foreground)] font-bold text-nowrap">intelligent communication</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <motion.div 
            whileHover={{ y: -8 }}
            className="flex flex-col items-center gap-4 p-8 rounded-[2.5rem] bg-[var(--card)] text-center border border-[var(--border)] shadow-2xl shadow-black/[0.03] group hover:border-primary-500/30 transition-all"
          >
            <div className="p-4 bg-primary-50 dark:bg-primary-500/10 rounded-2xl group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-primary-500 shrink-0 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--foreground)]">Deep Intelligence</h3>
              <p className="text-xs text-[var(--muted-foreground)] font-semibold mt-2 leading-relaxed">Contextual synthesis and automated thread summarization.</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -8 }}
            className="flex flex-col items-center gap-4 p-8 rounded-[2.5rem] bg-[var(--card)] text-center border border-[var(--border)] shadow-2xl shadow-black/[0.03] group hover:border-emerald-500/30 transition-all"
          >
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--foreground)]">Fortified Security</h3>
              <p className="text-xs text-[var(--muted-foreground)] font-semibold mt-2 leading-relaxed">Enterprise-grade threat detection & behavioral protection.</p>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6 pt-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 px-10 py-5 bg-neutral-950 text-white rounded-[2rem] font-bold hover:bg-neutral-900 transition-all shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {!loading && (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
            <span className="relative z-10 text-lg">
              {loading ? 'Securing Session...' : 'Continue with Google'}
            </span>
          </button>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm font-bold text-red-500 bg-red-500/5 border border-red-500/20 rounded-[1.5rem] px-8 py-4 flex items-center justify-center gap-3 backdrop-blur-sm"
              >
                <ShieldAlert className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center justify-center gap-3 opacity-40 group hover:opacity-100 transition-opacity duration-500">
            <div className="h-[1px] w-8 bg-[var(--foreground)]" />
            <p className="text-[11px] text-[var(--foreground)] font-black uppercase tracking-[0.2em]">
              Encrypted OAuth 2.0 Terminal
            </p>
            <div className="h-[1px] w-8 bg-[var(--foreground)]" />
          </div>
        </div>
      </motion.div>
    </div>

  );
}
