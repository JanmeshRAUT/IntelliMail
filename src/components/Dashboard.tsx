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
        // Update progress
        setScanProgress(10);
        setScanStatus('Fetching emails from Gmail...');
        
        const response = await axios.post('/api/gmail/fetch', { accessToken });
        const emails = response.data as Email[];

        // Group by threadId
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

          // Update progress
          setScanProgress(15 + (analyzed / threadCount) * 75);
          setScanStatus(`Analyzing thread ${analyzed + 1} of ${threadCount}...`);

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
          
          analyzed++;
        }

        setScanProgress(95);
        setScanStatus('Finalizing analysis...');

        upsertEmails(emails);
        upsertThreads(nextThreads);
        if (nextAlerts.length > 0) {
          pushAlerts(nextAlerts);
        }

        setScanProgress(100);
        setScanStatus('Scan complete!');
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
    const matchesFilter = filter === 'All' || t.analysis?.priority === filter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    // Sort by threat level first (High > Medium > Low)
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const aPriority = priorityOrder[a.analysis?.priority as keyof typeof priorityOrder] ?? 3;
    const bPriority = priorityOrder[b.analysis?.priority as keyof typeof priorityOrder] ?? 3;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Then by threat count (more threats first)
    const aThreats = a.analysis?.threats?.length ?? 0;
    const bThreats = b.analysis?.threats?.length ?? 0;
    return bThreats - aThreats;
  });

  // Calculate threat statistics
  const threatStats = {
    total: threads.length,
    withThreats: threads.filter(t => t.analysis?.threats && t.analysis.threats.length > 0).length,
    critical: threads.filter(t => t.analysis?.priority === 'High' && t.analysis?.threats && t.analysis.threats.length > 0).length,
    high: threads.filter(t => t.analysis?.priority === 'High').length,
    medium: threads.filter(t => t.analysis?.priority === 'Medium').length,
    low: threads.filter(t => t.analysis?.priority === 'Low' || !t.analysis?.priority).length,
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Unified Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col gap-6">
            {/* Title Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight">Gmail Security Monitor</h1>
                <p className="text-[var(--muted-foreground)] font-medium">Real-time threat detection & email security analysis</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchEmails}
                  disabled={refreshing}
                  className="flex items-center gap-2.5 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                  {refreshing ? 'Scanning...' : 'Scan Gmail'}
                </button>
              </div>
            </div>

            {/* Scan Progress Bar */}
            {(refreshing || scanProgress > 0) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 space-y-2 shadow-lg shadow-primary-500/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-4 h-4">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full"
                      />
                    </div>
                    <span className="text-white font-bold text-sm">{scanStatus || 'Scanning...'}</span>
                  </div>
                  <span className="text-white/80 text-xs font-semibold">{Math.round(scanProgress)}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(scanProgress, 100)}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-full bg-white rounded-full shadow-lg shadow-white/30"
                  />
                </div>
              </motion.div>
            )}

            {/* Threat Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={cn(
                "px-4 py-3 rounded-xl border text-center",
                threatStats.critical > 0 
                  ? "bg-red-50 dark:bg-red-500/5 border-red-500/30 dark:border-red-500/30"
                  : "bg-[var(--secondary)] border-[var(--border)]"
              )}>
                <p className={cn(
                  "text-2xl font-black",
                  threatStats.critical > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--muted-foreground)]"
                )}>{threatStats.critical}</p>
                <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Critical</p>
              </div>
              <div className={cn(
                "px-4 py-3 rounded-xl border text-center",
                threatStats.high > threatStats.critical
                  ? "bg-orange-50 dark:bg-orange-500/5 border-orange-500/30 dark:border-orange-500/30"
                  : "bg-[var(--secondary)] border-[var(--border)]"
              )}>
                <p className={cn(
                  "text-2xl font-black",
                  threatStats.high > threatStats.critical ? "text-orange-600 dark:text-orange-400" : "text-[var(--muted-foreground)]"
                )}>{threatStats.high - threatStats.critical}</p>
                <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">High</p>
              </div>
              <div className="px-4 py-3 rounded-xl border bg-[var(--secondary)] border-[var(--border)] text-center">
                <p className="text-2xl font-black text-[var(--muted-foreground)]">{threatStats.medium}</p>
                <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Medium</p>
              </div>
              <div className="px-4 py-3 rounded-xl border bg-[var(--secondary)] border-[var(--border)] text-center">
                <p className="text-2xl font-black text-[var(--muted-foreground)]">{threatStats.withThreats}</p>
                <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">With Threats</p>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)] transition-colors group-focus-within:text-primary-500" />
                <input 
                  type="text" 
                  placeholder="Search threats by email subject or sender..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm font-medium placeholder:text-[var(--muted-foreground)]/50"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {['All', 'High', 'Medium', 'Low'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f === 'All' ? 'All' : f)}
                    className={cn(
                      "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border-2",
                      filter === f 
                      ? f === 'All' ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/20" :
                        f === 'High' ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20" :
                        f === 'Medium' ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-500/20" :
                        "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20"
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
                          "block p-8 bg-[var(--card)] border-2 rounded-3xl hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden",
                          hasThreats
                          ? "border-red-500/50 bg-red-50/20 dark:bg-red-500/10" 
                          : thread.analysis?.priority === 'High'
                          ? "border-orange-500/50 bg-orange-50/20 dark:bg-orange-500/10"
                          : thread.analysis?.priority === 'Medium'
                          ? "border-amber-500/30 bg-amber-50/10 dark:bg-amber-500/5"
                          : "border-[var(--border)]"
                        )}
                      >
                        {hasThreats && (
                          <div className="absolute top-0 left-0 w-2 h-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                        )}
                        {thread.analysis?.priority === 'High' && !hasThreats && (
                          <div className="absolute top-0 left-0 w-2 h-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]" />
                        )}
                        
                        <div className="flex flex-col gap-6">
                          {/* Threat Badge & Subject */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-3 flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-bold text-xl text-[var(--foreground)] group-hover:text-primary-600 transition-colors truncate">
                                  {thread.subject}
                                </h3>
                              </div>
                              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed font-medium line-clamp-2">
                                {thread.analysis?.summary || "No analysis available yet. Tap Scan Gmail to process."}</p>
                            </div>
                            
                            <div className="shrink-0">
                              <span className={cn(
                                "px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap",
                                hasThreats
                                  ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/40"
                                  : thread.analysis?.priority === 'High'
                                  ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-500/40"
                                  : thread.analysis?.priority === 'Medium'
                                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40"
                                  : "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-500/40"
                              )}>
                                {hasThreats ? '⚠️ THREAT' : thread.analysis?.priority === 'High' ? '🔴 HIGH' : thread.analysis?.priority === 'Medium' ? '🟠 MEDIUM' : '✓ SAFE'}
                              </span>
                            </div>
                          </div>

                          {/* Threat Details */}
                          {hasThreats && thread.analysis?.threats && (
                            <div className="pt-4 border-t border-[var(--border)] space-y-3">
                              <div className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                Security Threats Detected ({threatCount})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {thread.analysis.threats.slice(0, 3).map((threat, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-3 py-1.5 text-xs font-semibold bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 dark:border-red-500/50 rounded-lg"
                                  >
                                    {threat}
                                  </span>
                                ))}
                                {thread.analysis.threats.length > 3 && (
                                  <span className="px-3 py-1.5 text-xs font-semibold bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 dark:border-red-500/50 rounded-lg">
                                    +{thread.analysis.threats.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="pt-4 border-t border-[var(--border)] flex flex-row md:flex-row items-center justify-between gap-3">
                            <span className="text-[11px] text-[var(--muted-foreground)] font-bold tracking-wider uppercase">
                              {new Date(thread.lastMessageTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            {thread.analysis && (
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
