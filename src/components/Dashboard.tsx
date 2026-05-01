import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Inbox, ShieldAlert, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Email,
  getAccessToken,
  getThreads,
  getEmails,
  isAccessTokenExpired,
  pushAlerts,
  setAccessToken,
  ThreadAnalysis,
  Thread,
  upsertEmails,
  upsertThreads,
  getUser
} from '../lib/localData';
import { requestGoogleAccessToken } from '../lib/googleAuth';

export default function Dashboard() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const hydrateData = () => {
      setThreads(getThreads());
      setEmails(getEmails());
      setLoading(false);
    };

    hydrateData();
    window.addEventListener('intellimail:data-updated', hydrateData);
    return () => window.removeEventListener('intellimail:data-updated', hydrateData);
  }, []);

  const fetchEmails = async () => {
    setRefreshing(true);
    setSyncError(null);

    const refreshToken = async (interactive: boolean): Promise<string | null> => {
      if (!clientId) {
        setSyncError('Missing VITE_GOOGLE_CLIENT_ID. Configure it in .env.');
        return null;
      }

      try {
        const tokenResponse = await requestGoogleAccessToken({
          clientId,
          prompt: interactive ? 'consent' : '',
        });

        if (!tokenResponse.access_token) {
          return null;
        }

        setAccessToken(tokenResponse.access_token, tokenResponse.expires_in);
        return tokenResponse.access_token;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        if (interactive) {
          setSyncError('Google re-authentication failed. Please try Sync Gmail again.');
        }
        return null;
      }
    };

    const syncWithToken = async (accessToken: string) => {
      try {
        setScanProgress(10);
        setScanStatus('Fetching emails...');
        
        const response = await axios.post('/api/gmail/fetch', { accessToken });
        const emails = response.data as Email[];

        const groupedThreads: Record<string, Email[]> = {};
        emails.forEach((email) => {
          if (!groupedThreads[email.threadId]) groupedThreads[email.threadId] = [];
          groupedThreads[email.threadId].push(email);
        });

        const threadCount = Object.keys(groupedThreads).length;
        const nextThreads: Thread[] = [];
        const nextAlerts: Alert[] = [];

        let analyzed = 0;
        for (const threadId in groupedThreads) {
          const threadEmails = groupedThreads[threadId];
          const latestEmail = threadEmails[0];

          setScanProgress(15 + (analyzed / threadCount) * 75);
          setScanStatus(`Analyzing ${analyzed + 1}/${threadCount}`);

          const user = getUser();
          const analysisRes = await axios.post('/api/analyze', { 
            emails: threadEmails,
            userId: user?.id 
          });
          const analysis = analysisRes.data as ThreadAnalysis;

          nextThreads.push({
            id: threadId,
            subject: latestEmail.subject,
            lastMessageTimestamp: latestEmail.timestamp,
            analysis,
          });

          if (analysis.threats && analysis.threats.length > 0) {
            nextAlerts.push({
              id: `${threadId}-threat-${Date.now()}`,
              type: 'Threat',
              message: `Security threat detected in thread: ${latestEmail.subject}`,
              threadId,
              timestamp: new Date().toISOString(),
            });
          } else if (analysis.priority === 'High') {
            nextAlerts.push({
              id: `${threadId}-urgent-${Date.now()}`,
              type: 'Urgent',
              message: `Urgent email detected: ${latestEmail.subject}`,
              threadId,
              timestamp: new Date().toISOString(),
            });
          }
          
          analyzed++;
        }

        setScanProgress(95);
        setScanStatus('Finalizing...');

        upsertEmails(emails);
        upsertThreads(nextThreads);
        if (nextAlerts.length > 0) {
          pushAlerts(nextAlerts);
        }

        setScanProgress(100);
        setScanStatus('Done!');
        setTimeout(() => {
          setScanProgress(0);
          setScanStatus('');
        }, 2000);
      } catch (error) {
        console.error('Analysis error:', error);
        setScanProgress(0);
        setScanStatus('');
        throw error;
      }
    };

    try {
      let accessToken = getAccessToken();

      if (!accessToken) {
        accessToken = await refreshToken(false);
        if (!accessToken) {
          accessToken = await refreshToken(true);
        }
      } else if (isAccessTokenExpired()) {
        const refreshedToken = await refreshToken(false);
        if (refreshedToken) {
          accessToken = refreshedToken;
        } else {
          accessToken = await refreshToken(true);
        }
      }

      if (!accessToken) {
        return;
      }

      try {
        await syncWithToken(accessToken);
      } catch (syncError) {
        console.error('Initial sync failed, attempting re-consent:', syncError);
        const renewedToken = await refreshToken(true);
        if (!renewedToken) {
          return;
        }
        await syncWithToken(renewedToken);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setSyncError('Unable to sync Gmail. Please try again in a moment.');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredThreads = threads.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'All' || t.analysis?.priority === filter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const aPriority = priorityOrder[a.analysis?.priority as keyof typeof priorityOrder] ?? 3;
    const bPriority = priorityOrder[b.analysis?.priority as keyof typeof priorityOrder] ?? 3;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    const aThreats = a.analysis?.threats?.length ?? 0;
    const bThreats = b.analysis?.threats?.length ?? 0;
    return bThreats - aThreats;
  });

  const threatStats = {
    total: threads.length,
    critical: threads.filter(t => t.analysis?.priority === 'High' && t.analysis?.threats && t.analysis.threats.length > 0).length,
    high: threads.filter(t => t.analysis?.priority === 'High').length,
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Intelligence Feed</h1>
              <p className="text-[var(--muted-foreground)] text-sm font-medium">Real-time Gmail threat analysis</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Compact Stats */}
              <div className="hidden sm:flex gap-2">
                <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                  <p className="text-lg font-black text-red-600">{threatStats.critical}</p>
                  <p className="text-[9px] font-bold text-red-700/60 uppercase tracking-widest">Critical</p>
                </div>
                <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center">
                  <p className="text-lg font-black text-orange-600">{threatStats.high}</p>
                  <p className="text-[9px] font-bold text-orange-700/60 uppercase tracking-widest">High</p>
                </div>
              </div>

              <button 
                onClick={fetchEmails}
                disabled={refreshing}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                {refreshing ? 'Scanning...' : 'Scan Gmail'}
              </button>
            </div>
          </div>

          {(refreshing || scanProgress > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">{scanStatus || 'Processing...'}</span>
                <span className="text-[10px] font-black text-primary-600">{Math.round(scanProgress)}%</span>
              </div>
              <div className="w-full h-1 bg-[var(--secondary)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(scanProgress, 100)}%` }}
                  className="h-full bg-primary-600"
                />
              </div>
            </motion.div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input 
                type="text" 
                placeholder="Search threats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-sm font-medium shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              {['All', 'High', 'Medium'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                    filter === f 
                      ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-lg shadow-black/5" 
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-primary-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {syncError && (
            <div className="px-6 py-4 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-xs font-bold flex items-center gap-3">
              <ShieldAlert className="w-4 h-4" />
              {syncError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-[var(--card)] animate-pulse rounded-2xl border border-[var(--border)]" />
              ))
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredThreads.map((thread) => {
                  const hasThreats = thread.analysis?.threats && thread.analysis.threats.length > 0;
                  return (
                    <motion.div
                      key={thread.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                    >
                      <Link 
                        to={`/thread/${thread.id}`}
                        className={cn(
                          "block p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl hover:border-primary-500/50 hover:shadow-xl transition-all group relative overflow-hidden",
                          hasThreats && "border-red-500/30 bg-red-50/10 dark:bg-red-500/5"
                        )}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1 min-w-0">
                              <h3 className="font-bold text-lg text-[var(--foreground)] group-hover:text-primary-600 transition-colors truncate">
                                {thread.subject}
                              </h3>
                              <p className="text-[var(--muted-foreground)] text-xs line-clamp-1 font-medium opacity-70">
                                {thread.analysis?.summary || "No analysis available."}</p>
                            </div>
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0",
                              hasThreats ? "bg-red-500 text-white border-red-600" :
                              thread.analysis?.priority === 'High' ? "bg-orange-500 text-white border-orange-600" :
                              "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                            )}>
                              {hasThreats ? 'Threat' : thread.analysis?.priority === 'High' ? 'High' : 'Safe'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                            <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider">
                              {new Date(thread.lastMessageTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            {thread.analysis?.category && (
                              <span className="text-[10px] font-black uppercase text-primary-600 tracking-[0.2em]">
                                {thread.analysis.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {filteredThreads.length === 0 && !loading && (
              <div className="text-center py-24 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl">
                <Inbox className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
                <p className="text-[var(--muted-foreground)] font-bold tracking-tight">No intelligence data found</p>
                <p className="text-[var(--muted-foreground)] text-xs mt-1">Try refreshing or adjusting filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
