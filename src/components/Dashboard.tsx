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

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all",
                activeTab === 'inbox'
                  ? "text-primary-600 border-primary-600"
                  : "text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]"
              )}
            >
              <Inbox className="w-4 h-4" />
              Inbox View
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all",
                activeTab === 'security'
                  ? "text-primary-600 border-primary-600"
                  : "text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]"
              )}
            >
              <Shield className="w-4 h-4" />
              Security Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'inbox' ? (
          // Inbox View (Original)
          <div className="p-8 max-w-6xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight">Inbox Insights</h1>
                <p className="text-[var(--muted-foreground)] font-medium">AI-powered conversation intelligence</p>
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
            </header>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)] transition-colors group-focus-within:text-primary-500" />
                <input 
                  type="text" 
                  placeholder="Search through analyzed threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm font-medium placeholder:text-[var(--muted-foreground)]/50"
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

            {loading ? (
              <div className="grid grid-cols-1 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-[var(--card)] animate-pulse rounded-3xl border border-[var(--border)]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredThreads.map((thread) => (
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
                          thread.analysis?.priority === 'High' 
                          ? "border-red-500/30 bg-red-50/10 dark:bg-red-500/5" 
                          : "border-[var(--border)]"
                        )}
                      >
                        {thread.analysis?.priority === 'High' && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                        )}
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-xl text-[var(--foreground)] group-hover:text-primary-600 transition-colors truncate">
                                {thread.subject}
                              </h3>
                              {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                                <div className="px-2 py-1 bg-red-500/10 rounded-lg">
                                  <ShieldAlert className="w-5 h-5 text-red-500" />
                                </div>
                              )}
                            </div>
                            <p className="text-[var(--muted-foreground)] text-sm leading-relaxed font-medium line-clamp-2 md:line-clamp-1">
                              {thread.analysis?.summary || "No analysis available yet. Tap Sync Gmail to process."}
                            </p>
                          </div>
                          
                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 shrink-0">
                            <span className="text-[11px] text-[var(--muted-foreground)] font-bold tracking-wider uppercase">
                              {new Date(thread.lastMessageTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <div className="flex gap-2">
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
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
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
        ) : (
          // Security Analysis View
          <div className="p-8">
            <SecurityDashboard 
              threads={securityThreads}
              onAnalyzeThreads={async (threadsToAnalyze) => {
                try {
                  const results = threadsToAnalyze.map(thread => {
                    // Simple fallback analysis based on email content
                    const threatKeywords = ['verify', 'confirm', 'urgent', 'click', 'update account', 'suspicious', 'alert', 'action required'];
                    
                    let highRiskCount = 0;
                    let threatCount = 0;

                    const emailAnalyses = thread.emails.map((email, idx) => {
                      const bodyLower = (email.body || '').toLowerCase();
                      const subjectLower = (email.subject || '').toLowerCase();
                      const combined = bodyLower + ' ' + subjectLower;
                      
                      // Detect threats
                      const detectedThreats: string[] = [];
                      if (combined.includes('verify')) detectedThreats.push('Verification request');
                      if (combined.includes('urgent') || combined.includes('immediate')) detectedThreats.push('Urgent language');
                      if (combined.includes('click here')) detectedThreats.push('Suspicious link');
                      if (combined.includes('confirm') && combined.includes('account')) detectedThreats.push('Account confirmation');
                      if (email.from && !email.from.includes(thread.participants[0]?.split('@')[1])) detectedThreats.push('Domain mismatch');
                      
                      // Extract links
                      const linkRegex = /(https?:\/\/[^\s]+)/g;
                      const links = (email.body || '').match(linkRegex) || [];
                      
                      // Calculate risk
                      let riskScore = 0;
                      riskScore += detectedThreats.length * 20;
                      riskScore += links.length * 10;
                      if (idx === 0 && detectedThreats.length > 0) riskScore += 10;
                      riskScore = Math.min(100, riskScore);
                      
                      const riskLevel: 'Low' | 'Medium' | 'High' = 
                        riskScore >= 60 ? 'High' : 
                        riskScore >= 30 ? 'Medium' : 
                        'Low';
                      
                      if (riskLevel === 'High') highRiskCount++;
                      threatCount += detectedThreats.length;
                      
                      return {
                        emailId: email.id,
                        sender: email.from,
                        riskScore,
                        riskLevel,
                        threats: detectedThreats,
                        links,
                        newSender: idx === 0,
                        toneChanged: false,
                        explanation: detectedThreats.length > 0 
                          ? `Detected: ${detectedThreats.join(', ')}`
                          : 'Email appears legitimate',
                      };
                    });

                    // Overall thread risk
                    const overallRisk = Math.ceil(
                      emailAnalyses.reduce((sum, e) => sum + e.riskScore, 0) / Math.max(1, emailAnalyses.length)
                    );

                    return {
                      threadId: thread.threadId,
                      emails: emailAnalyses,
                      overallRisk,
                      overallRiskLevel: overallRisk >= 60 ? 'High' : overallRisk >= 30 ? 'Medium' : 'Low',
                      firstSuspiciousEmailIndex: emailAnalyses.findIndex(e => e.riskLevel !== 'Low'),
                      threadThreatLevel: `${threatCount} potential threats`,
                    };
                  });
                  
                  return results;
                } catch (error) {
                  console.error('Security analysis failed:', error);
                  // Return empty analysis for all threads on error
                  return threadsToAnalyze.map(thread => ({
                    threadId: thread.threadId,
                    emails: thread.emails.map((email, idx) => ({
                      emailId: email.id,
                      sender: email.from,
                      riskScore: 0,
                      riskLevel: 'Low' as const,
                      threats: [],
                      links: [],
                      newSender: idx === 0,
                      toneChanged: false,
                      explanation: 'Analysis unavailable',
                    })),
                    overallRisk: 0,
                    overallRiskLevel: 'Low' as const,
                    threadThreatLevel: 'No threats detected',
                  }));
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
