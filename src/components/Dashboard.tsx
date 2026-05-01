import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Inbox, ShieldAlert, Shield, LayoutDashboard, Settings, LogOut, Menu, X } from 'lucide-react';
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
import { SecurityDashboard } from './SecurityDashboard';
import type { Thread as SecurityThread, Email as SecurityEmail } from '../lib/types';

export default function Dashboard() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'feed' | 'security'>('feed');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    withThreats: threads.filter(t => t.analysis?.threats && t.analysis.threats.length > 0).length,
    critical: threads.filter(t => t.analysis?.priority === 'High' && t.analysis?.threats && t.analysis.threats.length > 0).length,
    high: threads.filter(t => t.analysis?.priority === 'High').length,
    medium: threads.filter(t => t.analysis?.priority === 'Medium').length,
    low: threads.filter(t => t.analysis?.priority === 'Low' || !t.analysis?.priority).length,
  };

  const SidebarItem = ({ id, label, icon: Icon, active }: { id: string, label: string, icon: any, active: boolean }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
        active 
          ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20" 
          : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className={cn(!isSidebarOpen && "hidden")}>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-[var(--border)] bg-[var(--card)] transition-all duration-300 flex flex-col z-30",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "hidden")}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-black">iM</div>
            <span className="font-black text-lg tracking-tight">IntelliMail</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem id="feed" label="Intelligence Feed" icon={Inbox} active={activeTab === 'feed'} />
          <SidebarItem id="security" label="Security Dashboard" icon={Shield} active={activeTab === 'security'} />
          <div className="pt-4 mt-4 border-t border-[var(--border)] opacity-50">
            <SidebarItem id="settings" label="Settings" icon={Settings} active={false} />
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-[var(--border)] space-y-4">
          <button 
            onClick={fetchEmails}
            disabled={refreshing}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50",
              !isSidebarOpen && "px-0"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            <span className={cn(!isSidebarOpen && "hidden")}>{refreshing ? 'Scanning...' : 'Scan Gmail'}</span>
          </button>
          
          <div className={cn("flex items-center gap-3 px-2 py-2 rounded-xl bg-[var(--secondary)]", !isSidebarOpen && "justify-center px-0")}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-500 flex-shrink-0" />
            <div className={cn("min-w-0 flex-1", !isSidebarOpen && "hidden")}>
              <p className="text-xs font-black truncate">{getUser()?.name || 'Janmesh Raut'}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] font-bold truncate">Security Analyst</p>
            </div>
            <LogOut className={cn("w-4 h-4 text-[var(--muted-foreground)] hover:text-red-500 cursor-pointer", !isSidebarOpen && "hidden")} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Progress Header (Floating) */}
        {(refreshing || scanProgress > 0) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">{scanStatus || 'Processing...'}</span>
                </div>
                <span className="text-xs font-black text-primary-600">{Math.round(scanProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--secondary)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(scanProgress, 100)}%` }}
                  className="h-full bg-primary-600 rounded-full"
                />
              </div>
            </motion.div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-8 space-y-8">
            {activeTab === 'feed' ? (
              <>
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">Intelligence Feed</h2>
                    <p className="text-[var(--muted-foreground)] font-medium">Real-time Gmail threat analysis</p>
                  </div>
                  
                  {/* Compact Stats */}
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                      <p className="text-lg font-black text-red-600">{threatStats.critical}</p>
                      <p className="text-[9px] font-bold text-red-700/60 uppercase tracking-widest">Critical</p>
                    </div>
                    <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center">
                      <p className="text-lg font-black text-orange-600">{threatStats.high}</p>
                      <p className="text-[9px] font-bold text-orange-700/60 uppercase tracking-widest">High</p>
                    </div>
                    <div className="px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-xl text-center">
                      <p className="text-lg font-black text-[var(--muted-foreground)]">{threatStats.total}</p>
                      <p className="text-[9px] font-bold text-[var(--muted-foreground)]/60 uppercase tracking-widest">Total</p>
                    </div>
                  </div>
                </header>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input 
                      type="text" 
                      placeholder="Search threats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['All', 'High', 'Medium'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                          filter === f 
                            ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" 
                            : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-primary-300"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {syncError && (
                  <div className="px-6 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-sm font-semibold flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
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
                                    <p className="text-[var(--muted-foreground)] text-xs line-clamp-1 font-medium">
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
                                  <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase">
                                    {new Date(thread.lastMessageTimestamp).toLocaleDateString()}
                                  </span>
                                  {thread.analysis?.category && (
                                    <span className="text-[10px] font-black uppercase text-primary-600 tracking-widest">
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
                    <div className="text-center py-20 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl">
                      <Inbox className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
                      <p className="text-[var(--muted-foreground)] font-bold">No threats found</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full">
                <header className="mb-8">
                  <h2 className="text-3xl font-black tracking-tight">Security Dashboard</h2>
                  <p className="text-[var(--muted-foreground)] font-medium">Forensic system intelligence</p>
                </header>
                <div className="rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-2xl">
                  <SecurityDashboard 
                    threads={threads.map(t => ({
                      threadId: t.id,
                      participants: [t.subject],
                      emails: [] 
                    })) as any} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
