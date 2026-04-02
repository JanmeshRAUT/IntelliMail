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
        id: profile.sub,
        name: profile.name || profile.email,
        email: profile.email,
        avatarUrl: profile.picture,
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
            <Mail className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">IntelliMail</h1>
          <p className="text-neutral-500 text-lg">Gmail Thread Detection & AI Analysis System</p>
        </div>

        <div className="grid grid-cols-1 gap-4 py-8">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-neutral-50 text-left border border-neutral-100">
            <Zap className="w-6 h-6 text-yellow-500 shrink-0" />
            <div>
              <h3 className="font-semibold text-neutral-900">AI Thread Detection</h3>
              <p className="text-sm text-neutral-500">Automatically group and organize your conversations.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-neutral-50 text-left border border-neutral-100">
            <ShieldCheck className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <h3 className="font-semibold text-neutral-900">Threat Analysis</h3>
              <p className="text-sm text-neutral-500">Detect phishing and suspicious links in real-time.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-60"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-neutral-900 text-xs font-bold">
            G
          </span>
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-left">
            {error}
          </p>
        )}
        
        <p className="text-xs text-neutral-400">
          Google OAuth is used directly for Gmail access.
        </p>
      </motion.div>
    </div>
  );
}
