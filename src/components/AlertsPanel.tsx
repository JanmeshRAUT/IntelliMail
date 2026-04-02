import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Bell, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Alert, getAlerts } from '../lib/localData';

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const syncAlerts = () => {
      setAlerts(getAlerts().slice(0, 10));
    };

    syncAlerts();
    window.addEventListener('intellimail:data-updated', syncAlerts);

    return () => window.removeEventListener('intellimail:data-updated', syncAlerts);
  }, []);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl transition-all duration-300 transform active:scale-95 group backdrop-blur-md bg-opacity-80",
          alerts.length > 0 
          ? "border-red-500/30 text-red-600 dark:text-red-400" 
          : "text-[var(--muted-foreground)] hover:border-primary-500 hover:text-primary-600"
        )}
        aria-label="Toggle alerts"
      >
        <Bell className={cn("w-6 h-6", alerts.length > 0 && "animate-pulse")} />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[var(--card)] shadow-lg shadow-red-500/40 transform group-hover:scale-110 transition-transform">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-full right-0 mt-4 w-[380px] bg-[var(--card)] border border-[var(--border)] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[110] overflow-hidden dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--secondary)]/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="font-extrabold text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">System Alerts</h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1.5 hover:bg-[var(--secondary)] rounded-lg transition-colors text-[var(--muted-foreground)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="max-h-[420px] overflow-y-auto scrollbar-hide">
                {alerts.length > 0 ? (
                  <div className="divide-y divide-[var(--border)]">
                    {alerts.map((alert) => (
                      <Link
                        key={alert.id}
                        to={`/thread/${alert.threadId}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-start gap-4 p-5 hover:bg-primary-50 dark:hover:bg-primary-500/5 transition-all group"
                      >
                        <div className={cn(
                          "p-2.5 rounded-xl shrink-0 shadow-sm",
                          alert.type === 'Threat' 
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 group-hover:scale-110" 
                          : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 group-hover:scale-110"
                        )}>
                          {alert.type === 'Threat' ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <p className="text-xs font-bold text-[var(--foreground)] group-hover:text-primary-600 transition-colors leading-relaxed">
                            {alert.message}
                          </p>
                          <p className="text-[10px] text-[var(--muted-foreground)] font-bold tracking-tight opacity-60">
                            {new Date(alert.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} • Conversational Insight
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-[var(--foreground)]">All clear!</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest px-8">No critical intelligence alerts at this time.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
