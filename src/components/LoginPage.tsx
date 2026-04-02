import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Mail, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Access token can be retrieved here if needed for Gmail API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('gmail_access_token', credential.accessToken);
      }
    } catch (error) {
      console.error('Login failed:', error);
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
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
        
        <p className="text-xs text-neutral-400">
          By signing in, you agree to connect your Gmail account for analysis.
        </p>
      </motion.div>
    </div>
  );
}
