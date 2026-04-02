import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Bell, X } from 'lucide-react';
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
        className="relative p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500">Alerts</h3>
                <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {alerts.length > 0 ? (
                  <div className="divide-y divide-neutral-100">
                    {alerts.map((alert) => (
                      <Link
                        key={alert.id}
                        to={`/thread/${alert.threadId}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-start gap-3 p-4 hover:bg-neutral-50 transition-colors group"
                      >
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          alert.type === 'Threat' ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
                        )}>
                          {alert.type === 'Threat' ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                            {alert.message}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <Bell className="w-8 h-8 text-neutral-200 mx-auto" />
                    <p className="text-sm text-neutral-500 font-medium">All clear!</p>
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
