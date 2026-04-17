import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Inbox, ShieldAlert } from 'lucide-react';
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
      const response = await axios.post('/api/gmail/fetch', { accessToken });
      const emails = response.data as Email[];

      // Group by threadId
      const groupedThreads: Record<string, Email[]> = {};
      emails.forEach((email) => {
        if (!groupedThreads[email.threadId]) groupedThreads[email.threadId] = [];
        groupedThreads[email.threadId].push(email);
      });

      const nextThreads: Thread[] = [];
      const nextAlerts: Alert[] = [];

      for (const threadId in groupedThreads) {
        const threadEmails = groupedThreads[threadId];
        const latestEmail = threadEmails[0];

        // Analyze thread
        const analysisRes = await axios.post('/api/analyze', { emails: threadEmails });
        const analysis = analysisRes.data as ThreadAnalysis;

        nextThreads.push({
          id: threadId,
          subject: latestEmail.subject,
          lastMessageTimestamp: latestEmail.timestamp,
          analysis,
        });

        // Create alerts from analysis output
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
      }

      upsertEmails(emails);
      upsertThreads(nextThreads);
      if (nextAlerts.length > 0) {
        pushAlerts(nextAlerts);
      }
    };

    try {
      let accessToken = getAccessToken();

      // Only refresh if token is missing or expired
      if (!accessToken) {
        accessToken = await refreshToken(false);
        if (!accessToken) {
          accessToken = await refreshToken(true);
        }
      } else if (isAccessTokenExpired()) {
        // Token is expired, attempt silent refresh first
        const refreshedToken = await refreshToken(false);
        if (refreshedToken) {
          accessToken = refreshedToken;
        } else {
          // Silent refresh failed, try interactive re-consent
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
    const matchesFilter = filter === 'All' || t.analysis?.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Unified Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight">Inbox & Security</h1>
                <p className="text-[var(--muted-foreground)] font-medium">AI-powered conversation intelligence with security analysis</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchEmails}
                  disabled={refreshing}
                  className="flex items-center gap-2.5 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                  {refreshing ? 'Processing...' : 'Sync Gmail'}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)] transition-colors group-focus-within:text-primary-500" />
                <input 
                  type="text" 
                  placeholder="Search through analyzed threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm font-medium placeholder:text-[var(--muted-foreground)]/50"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {['All', 'Work', 'Personal', 'Promotions', 'Spam'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border-2",
                      filter === f 
                      ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/20" 
                      : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-primary-300"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-10">
          {syncError && (
            <div className="px-6 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-sm font-semibold flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              {syncError}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-[var(--card)] animate-pulse rounded-3xl border border-[var(--border)]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredThreads.map((thread) => {
                  const hasThreats = thread.analysis?.threats && thread.analysis.threats.length > 0;
                  const threatCount = thread.analysis?.threats?.length || 0;
                  
                  return (
                    <motion.div
                      key={thread.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Link 
                        to={`/thread/${thread.id}`}
                        className={cn(
                          "block p-8 bg-[var(--card)] border rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden",
                          hasThreats
                          ? "border-red-500/30 bg-red-50/10 dark:bg-red-500/5" 
                          : thread.analysis?.priority === 'High'
                          ? "border-orange-500/30 bg-orange-50/10 dark:bg-orange-500/5"
                          : "border-[var(--border)]"
                        )}
                      >
                        {hasThreats && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                        )}
                        {thread.analysis?.priority === 'High' && !hasThreats && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                        )}
                        
                        <div className="flex flex-col gap-6">
                          {/* Header Section */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="space-y-3 flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-bold text-xl text-[var(--foreground)] group-hover:text-primary-600 transition-colors truncate">
                                  {thread.subject}
                                </h3>
                                {hasThreats && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30">
                                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{threatCount} Threats</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed font-medium line-clamp-2">
                                {thread.analysis?.summary || "No analysis available yet. Tap Sync Gmail to process."}
                              </p>
                            </div>
                            
                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                              <span className="text-[11px] text-[var(--muted-foreground)] font-bold tracking-wider uppercase">
                                {new Date(thread.lastMessageTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Threat Details Section */}
                          {hasThreats && thread.analysis?.threats && (
                            <div className="pt-4 border-t border-[var(--border)] space-y-3">
                              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Security Alerts</div>
                              <div className="flex flex-wrap gap-2">
                                {thread.analysis.threats.map((threat, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2.5 py-1 text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg"
                                  >
                                    {threat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tags Section */}
                          <div className="pt-4 border-t border-[var(--border)] flex flex-row md:flex-row items-center gap-2 flex-wrap">
                            {thread.analysis && (
                              <>
                                <span className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border",
                                  thread.analysis.category === 'Work' ? "bg-blue-600 text-white border-blue-700 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30" :
                                  thread.analysis.category === 'Personal' ? "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30" :
                                  thread.analysis.category === 'Spam' ? "bg-red-600 text-white border-red-700 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30" :
                                  thread.analysis.category === 'Promotions' ? "bg-purple-600 text-white border-purple-700 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30" :
                                  "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                                )}>
                                  {thread.analysis.category}
                                </span>
                                <span className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border",
                                  thread.analysis.sentiment === 'Positive' ? "bg-teal-600 text-white border-teal-700 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30" :
                                  thread.analysis.sentiment === 'Negative' ? "bg-rose-600 text-white border-rose-700 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30" :
                                  "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                                )}>
                                  {thread.analysis.sentiment}
                                </span>
                                {thread.analysis.priority && (
                                  <span className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border",
                                    thread.analysis.priority === 'High' ? "bg-orange-600 text-white border-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30" :
                                    thread.analysis.priority === 'Medium' ? "bg-amber-600 text-white border-amber-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30" :
                                    "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                                  )}>
                                    {thread.analysis.priority} Priority
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {filteredThreads.length === 0 && !loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24 space-y-6 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] border-dashed"
                >
                  <div className="inline-flex p-6 bg-[var(--secondary)] rounded-3xl text-primary-500">
                    <Inbox className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Nothing found here</h3>
                    <p className="text-[var(--muted-foreground)] max-w-sm mx-auto font-medium">Try syncing your account or adjusting your search filters to see more activity.</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
