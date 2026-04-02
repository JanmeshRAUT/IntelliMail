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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const hydrateThreads = () => {
      setThreads(getThreads());
      setLoading(false);
    };

    hydrateThreads();
    window.addEventListener('intellimail:data-updated', hydrateThreads);
    return () => window.removeEventListener('intellimail:data-updated', hydrateThreads);
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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Inbox Insights</h1>
          <p className="text-neutral-500">AI-powered conversation analysis</p>
        </div>
        <button 
          onClick={fetchEmails}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          {refreshing ? 'Syncing...' : 'Sync Gmail'}
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['All', 'Work', 'Personal', 'Promotions', 'Spam'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                filter === f ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {syncError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          {syncError}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredThreads.map((thread) => (
              <motion.div
                key={thread.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <Link 
                  to={`/thread/${thread.id}`}
                  className={cn(
                    "block p-6 bg-white border rounded-2xl hover:shadow-md transition-all group relative overflow-hidden",
                    thread.analysis?.priority === 'High' ? "border-red-200 bg-red-50/30" : "border-neutral-200"
                  )}
                >
                  {thread.analysis?.priority === 'High' && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  )}
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-neutral-900 group-hover:text-blue-600 transition-colors">
                          {thread.subject}
                        </h3>
                        {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <p className="text-neutral-500 text-sm line-clamp-1">
                        {thread.analysis?.summary || "No summary available. Sync to analyze."}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-neutral-400 font-medium">
                        {new Date(thread.lastMessageTimestamp).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {thread.analysis && (
                          <>
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                              thread.analysis.category === 'Work' ? "bg-blue-100 text-blue-700" :
                              thread.analysis.category === 'Personal' ? "bg-green-100 text-green-700" :
                              thread.analysis.category === 'Spam' ? "bg-red-100 text-red-700" :
                              "bg-neutral-100 text-neutral-700"
                            )}>
                              {thread.analysis.category}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                              thread.analysis.sentiment === 'Positive' ? "bg-emerald-100 text-emerald-700" :
                              thread.analysis.sentiment === 'Negative' ? "bg-rose-100 text-rose-700" :
                              "bg-neutral-100 text-neutral-700"
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
          
          {filteredThreads.length === 0 && (
            <div className="text-center py-20 space-y-4">
              <div className="inline-flex p-4 bg-neutral-100 rounded-full">
                <Inbox className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-neutral-900">No threads found</h3>
                <p className="text-neutral-500">Try syncing your Gmail or changing filters.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
