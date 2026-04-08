import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Inbox, ShieldAlert, Shield, Moon, Sun } from 'lucide-react';
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
import { SecurityDashboard } from './SecurityDashboard';
import type { Thread as SecurityThread, Email as SecurityEmail } from '../lib/types';

export default function Dashboard() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'security'>('inbox');
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

  // Convert localData threads to security analysis format
  const convertToSecurityThreads = (): SecurityThread[] => {
    return threads.map(thread => {
      const threadEmails = emails.filter(e => e.threadId === thread.id);
      
      // Extract participants from email addresses
      const participants = new Set<string>();
      threadEmails.forEach(email => {
        participants.add(email.from);
        email.snippet; // Just to avoid unused variable warning
      });

      return {
        threadId: thread.id,
        emails: threadEmails as SecurityEmail[],
        participants: Array.from(participants),
      };
    });
  };

  const securityThreads = convertToSecurityThreads();

  const analyzeSecurityThreads = async (threadsToAnalyze: SecurityThread[]) => {
    const response = await axios.post('/api/security/analyze-threads', {
      threads: threadsToAnalyze,
    });

    const payload = response.data as {
      success?: boolean;
      data?: unknown;
      error?: string;
    };

    if (!payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.error || 'Security analysis failed');
    }

    return payload.data;
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md sticky top-0 z-[40]">
        <div className="max-w-7xl mx-auto px-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inbox')}
              className={cn(
                "group relative flex items-center gap-3 px-8 py-5 text-sm font-bold transition-all",
                activeTab === 'inbox'
                  ? "text-primary-600"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Inbox className={cn("w-4 h-4 transition-transform group-hover:scale-110", activeTab === 'inbox' && "text-primary-500")} />
              Inbox Synthesis
              {activeTab === 'inbox' && (
                <motion.div layoutId="dashboardTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-t-full shadow-[0_-4px_12px_rgba(2,109,198,0.3)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                "group relative flex items-center gap-3 px-8 py-5 text-sm font-bold transition-all",
                activeTab === 'security'
                  ? "text-primary-600"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Shield className={cn("w-4 h-4 transition-transform group-hover:scale-110", activeTab === 'security' && "text-primary-500")} />
              Security Protocol
              {activeTab === 'security' && (
                <motion.div layoutId="dashboardTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-t-full shadow-[0_-4px_12px_rgba(2,109,198,0.3)]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-[var(--background)]">
        {activeTab === 'inbox' ? (
          <div className="p-10 max-w-7xl mx-auto space-y-12">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="space-y-2">
                <h1 className="text-6xl font-extrabold tracking-tightest bg-clip-text text-transparent bg-gradient-to-br from-[var(--foreground)] to-[var(--foreground)]/50">
                  IntelliFlow
                </h1>
                <p className="text-lg text-[var(--muted-foreground)] font-semibold tracking-tight">
                  High-fidelity mail intelligence and behavioral synthesis.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={fetchEmails}
                  disabled={refreshing}
                  className="group flex items-center gap-3 px-8 py-4 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded-2xl font-bold hover:scale-[1.02] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] transition-all disabled:opacity-50 active:scale-95"
                >
                  <RefreshCw className={cn("w-4 h-4 transition-transform group-hover:rotate-180 duration-500", refreshing && "animate-spin")} />
                  {refreshing ? 'Synthesizing...' : 'Sync Gmail'}
                </button>
              </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)] transition-colors group-focus-within:text-primary-500" />
                <input 
                  type="text" 
                  placeholder="Query synthesized threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4.5 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-[2rem] focus:ring-8 focus:ring-primary-500/5 focus:border-primary-500 outline-none transition-all shadow-sm font-bold placeholder:text-[var(--muted-foreground)]/40 text-lg"
                />
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                {['All', 'Work', 'Personal', 'Promotions', 'Spam'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-7 py-4.5 rounded-[1.5rem] text-sm font-bold transition-all whitespace-nowrap border-2",
                      filter === f 
                      ? "bg-primary-600 text-white border-primary-600 shadow-xl shadow-primary-500/20" 
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-primary-300 hover:text-[var(--foreground)]"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {syncError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-8 py-6 rounded-[2rem] bg-red-500/5 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-4 backdrop-blur-sm shadow-xl shadow-red-500/5"
              >
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                </div>
                {syncError}
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-40 bg-[var(--card)] animate-pulse rounded-[2.5rem] border border-[var(--border)]" />
                ))
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredThreads.map((thread) => (
                    <motion.div
                      key={thread.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      <Link 
                        to={`/thread/${thread.id}`}
                        className={cn(
                          "block p-10 bg-[var(--card)] border rounded-[3rem] hover:shadow-2xl hover:shadow-black/[0.04] hover:-translate-y-1.5 transition-all group relative overflow-hidden",
                          thread.analysis?.priority === 'High' 
                          ? "border-red-500/30 bg-red-500/[0.02]" 
                          : "border-[var(--border)] hover:border-primary-500/30"
                        )}
                      >
                        {thread.analysis?.priority === 'High' && (
                          <div className="absolute top-0 left-0 w-2 h-full bg-red-500 shadow-[4px_0_15px_rgba(239,68,68,0.3)] animate-pulse" />
                        )}
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                          <div className="space-y-4 flex-1 min-w-0">
                            <div className="flex items-center gap-4">
                              <h3 className="font-extrabold text-2xl text-[var(--foreground)] group-hover:text-primary-600 transition-colors truncate tracking-tight">
                                {thread.subject}
                              </h3>
                              {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                                <div className="px-2.5 py-1.5 bg-red-500/10 rounded-xl animate-bounce">
                                  <ShieldAlert className="w-5 h-5 text-red-500" />
                                </div>
                              )}
                            </div>
                            <p className="text-[var(--muted-foreground)] text-[15px] leading-relaxed font-semibold line-clamp-2 lg:line-clamp-1 max-w-3xl">
                              {thread.analysis?.summary || "System has not yet synthesized this conversation cluster."}
                            </p>
                          </div>
                          
                          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-6 shrink-0">
                            <span className="text-[11px] text-[var(--muted-foreground)] font-black tracking-[0.2em] uppercase opacity-60 group-hover:opacity-100 transition-opacity">
                              {new Date(thread.lastMessageTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <div className="flex gap-2.5">
                              {thread.analysis && (
                                <>
                                  <span className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border transition-colors",
                                    thread.analysis.category === 'Work' ? "bg-blue-500/5 text-blue-600 border-blue-500/20" :
                                    thread.analysis.category === 'Personal' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" :
                                    thread.analysis.category === 'Spam' ? "bg-red-500/5 text-red-600 border-red-500/20" :
                                    thread.analysis.category === 'Promotions' ? "bg-purple-500/5 text-purple-600 border-purple-500/20" :
                                    "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                                  )}>
                                    {thread.analysis.category}
                                  </span>
                                  <span className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border transition-colors",
                                    thread.analysis.sentiment === 'Positive' ? "bg-teal-500/5 text-teal-600 border-teal-500/20" :
                                    thread.analysis.sentiment === 'Negative' ? "bg-rose-500/5 text-rose-600 border-rose-500/20" :
                                    "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                                  )}>
                                    {thread.analysis.sentiment}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              
              {!loading && filteredThreads.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-32 space-y-8 bg-[var(--card)] border border-[var(--border)] border-dashed rounded-[3rem]"
                >
                  <div className="inline-flex p-8 bg-[var(--secondary)]/50 rounded-[2.5rem] text-primary-500 shadow-xl shadow-black/[0.02]">
                    <Inbox className="w-12 h-12" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-extrabold tracking-tight">Archive Empty</h3>
                    <p className="text-[var(--muted-foreground)] max-w-sm mx-auto font-bold text-lg leading-relaxed">Adjust filters or initialize a fresh sync to populate the intelligence matrix.</p>
                  </div>
                  <button onClick={fetchEmails} className="px-8 py-3 bg-[var(--foreground)] text-[var(--background)] rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all">
                    Initiate Sync
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <SecurityDashboard 
                threads={securityThreads}
                onAnalyzeThreads={analyzeSecurityThreads}
              />
            </motion.div>
          </div>
        )}
      </div>

    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
