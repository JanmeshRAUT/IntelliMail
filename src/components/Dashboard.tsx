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
import RiskBadge from './RiskBadge';
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

  const getThreadRiskLevel = (priority?: string) => {
    if (!priority) return 'Low' as const;
    const normalized = priority.toLowerCase();
    if (normalized.includes('high') || normalized.includes('critical') || normalized.includes('urgent')) return 'High' as const;
    if (normalized.includes('medium') || normalized.includes('moderate')) return 'Medium' as const;
    return 'Low' as const;
  };

  const getThreatSummary = (thread: Thread) => {
    const count = thread.analysis?.threats?.length ?? 0;
    if (count > 0) {
      return `${count} threat keyword${count > 1 ? 's' : ''} detected`;
    }
    return 'No threat keywords detected';
  };

  const totalThreads = threads.length;
  const threatThreads = threads.filter((thread) => thread.analysis?.threats?.length > 0).length;
  const urgentThreads = threads.filter((thread) => thread.analysis?.priority === 'High').length;
  const matchingThreads = filteredThreads.length;
  const currentFilterLabel = filter === 'All' ? 'All categories' : filter;

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
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={cn(
                "group relative flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all",
                activeTab === 'inbox'
                  ? "text-primary-600"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Inbox className={cn("w-3.5 h-3.5", activeTab === 'inbox' && "text-primary-500")} />
              Inbox
              {activeTab === 'inbox' && (
                <motion.div layoutId="dashboardTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                "group relative flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all",
                activeTab === 'security'
                  ? "text-primary-600"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Shield className={cn("w-3.5 h-3.5", activeTab === 'security' && "text-primary-500")} />
              Security
              {activeTab === 'security' && (
                <motion.div layoutId="dashboardTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-[var(--background)]">
        {activeTab === 'inbox' ? (
          <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-[var(--foreground)] to-[var(--foreground)]/50">
                  IntelliFlow
                </h1>
                <p className="text-sm text-[var(--muted-foreground)] font-semibold tracking-tight">
                  Mail intelligence and synthesis.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchEmails}
                  disabled={refreshing}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                  {refreshing ? 'Synthesizing...' : 'Sync Gmail'}
                </button>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Threads indexed</p>
                <p className="mt-4 text-3xl font-extrabold text-[var(--foreground)]">{totalThreads}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Total conversation threads synced to IntelliMail.</p>
              </div>
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Threats</p>
                <p className="mt-4 text-3xl font-extrabold text-red-600">{threatThreads}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Threads with one or more security threat indicators.</p>
              </div>
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Urgent risk</p>
                <p className="mt-4 text-3xl font-extrabold text-amber-600">{urgentThreads}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">High-priority threads that need immediate review.</p>
              </div>
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Active filter</p>
                <p className="mt-4 text-3xl font-extrabold text-[var(--foreground)]">{matchingThreads}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Showing {currentFilterLabel} ({filter === 'All' ? 'all threads' : `${filter} threads`}).</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 sticky top-[74px] z-30 bg-[var(--background)]/95 backdrop-blur-md rounded-3xl p-4 border border-[var(--border)]">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input 
                  type="text" 
                  placeholder="Query threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl focus:ring-4 focus:ring-primary-500/5 focus:border-primary-500 outline-none transition-all text-sm font-semibold"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                {['All', 'Work', 'Personal', 'Promotions', 'Spam'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                      filter === f 
                      ? "bg-primary-600 text-white border-primary-600" 
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-primary-300"
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
                          "block p-5 bg-[var(--card)] border rounded-2xl hover:shadow-lg transition-all relative overflow-hidden",
                          thread.analysis?.priority === 'High' 
                          ? "border-red-500/20 bg-red-500/[0.01]" 
                          : "border-[var(--border)] hover:border-primary-500/20"
                        )}
                      >
                        {thread.analysis?.priority === 'High' && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[2px_0_10px_rgba(239,68,68,0.2)]" />
                        )}
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="font-bold text-lg text-[var(--foreground)] truncate tracking-tight">
                                {thread.subject}
                              </h3>
                              {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                                <ShieldAlert className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {thread.analysis ? (
                                <RiskBadge
                                  level={getThreadRiskLevel(thread.analysis.priority)}
                                  size="sm"
                                  showScore={false}
                                />
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--secondary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                                  No risk data
                                </span>
                              )}
                              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--secondary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                                {thread.analysis?.category || 'Unknown category'}
                              </span>
                            </div>
                            <p className="text-[var(--muted-foreground)] text-xs leading-relaxed font-semibold line-clamp-1 max-w-2xl">
                              {thread.analysis?.summary || 'System processing conversation cluster.'}
                            </p>
                          </div>
                          
                          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0">
                            <span className="text-[9px] text-[var(--muted-foreground)] font-black tracking-widest uppercase opacity-60">
                              {new Date(thread.lastMessageTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex gap-1.5">
                              {thread.analysis && (
                                <>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                    thread.analysis.category === 'Work' ? "bg-blue-500/5 text-blue-600 border-blue-500/10" :
                                    thread.analysis.category === 'Personal' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" :
                                    thread.analysis.category === 'Spam' ? "bg-red-500/5 text-red-600 border-red-500/10" :
                                    "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                                  )}>
                                    {thread.analysis.category}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] font-semibold">
                            {getThreatSummary(thread)}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-primary-600 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-primary-500/20">
                            Review thread
                          </span>
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
          <div className="p-4 md:p-6">
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
