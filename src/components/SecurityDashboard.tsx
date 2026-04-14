import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, AlertCircle, CheckCircle, Zap, Loader2, ShieldCheck, Sparkles, ArrowUpRight, Mail, Layers3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThreadSecuritySummary } from './ThreadSecuritySummary';
import { SecurityTimeline } from './SecurityTimeline';
import type { Thread, ThreadSecuritySummary as ThreadSecuritySummaryType } from '../lib/types';

interface SecurityDashboardProps {
  threads: Thread[];
  onAnalyzeThreads?: (threads: Thread[]) => Promise<ThreadSecuritySummaryType[]>;
}

const ANALYSIS_CACHE_KEY = 'intellimail_security_analysis_cache_v1';

/**
 * Main Security Dashboard - Integrates all security analysis components with severity grouping
 */
export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  threads,
  onAnalyzeThreads,
}) => {
  const navigate = useNavigate();
  const cn = (...args: any[]) => args.filter(Boolean).join(' ');
  const [analyses, setAnalyses] = useState<Map<string, ThreadSecuritySummaryType>>(() => {
    try {
      const raw = sessionStorage.getItem(ANALYSIS_CACHE_KEY);
      if (!raw) {
        return new Map();
      }
      const entries = JSON.parse(raw) as Array<[string, ThreadSecuritySummaryType]>;
      return new Map(entries);
    } catch {
      return new Map();
    }
  });
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(new Set<string>());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'summary' | 'timeline'>('summary');

  const isAnalysisStale = (thread: Thread, analysis?: ThreadSecuritySummaryType) => {
    if (!analysis) return true;
    return analysis.emails.length !== thread.emails.length;
  };

  // Persist analyses cache during session to avoid unnecessary re-analysis on remount.
  useEffect(() => {
    try {
      const entries = Array.from(analyses.entries());
      sessionStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore cache write failures.
    }
  }, [analyses]);

  // Analyze only missing/stale threads to prevent repeated full re-analysis.
  useEffect(() => {
    if (!onAnalyzeThreads || threads.length === 0) {
      return;
    }

    const pendingThreads = threads.filter((thread) => isAnalysisStale(thread, analyses.get(thread.threadId)));
    if (pendingThreads.length > 0) {
      analyzeAllThreads(pendingThreads);
    }
  }, [threads, analyses, onAnalyzeThreads]);

  const analyzeAllThreads = async (threadsToAnalyze: Thread[]) => {
    if (!onAnalyzeThreads || threadsToAnalyze.length === 0) return;

    setLoading(true);
    setAnalyzing(new Set(threadsToAnalyze.map(t => t.threadId)));
    
    try {
      // Analyze in batches to avoid overwhelming the server
      const batchSize = 5;
      const results: ThreadSecuritySummaryType[] = [];
      
      for (let i = 0; i < threadsToAnalyze.length; i += batchSize) {
        const batch = threadsToAnalyze.slice(i, i + batchSize);
        const batchResults = await onAnalyzeThreads(batch);
        results.push(...batchResults);
        
        // Update analyzing set as batches complete
        setAnalyzing(prev => {
          const updated = new Set(prev);
          batch.forEach(t => updated.delete(t.threadId));
          return updated;
        });
      }
      
      setAnalyses((prev) => {
        const next = new Map(prev);
        results.forEach((result) => {
          next.set(result.threadId, result);
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to analyze threads:', error);
    } finally {
      setLoading(false);
      setAnalyzing(new Set());
    }
  };

  // Get selected thread and analysis
  const selectedThread = threads.find((t) => t.threadId === selectedThreadId);
  const selectedAnalysis = selectedThreadId ? analyses.get(selectedThreadId) : undefined;

  // Auto-select first high-risk thread, or first thread
  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      const highRisk = threads.find(t => analyses.get(t.threadId)?.overallRiskLevel === 'High');
      setSelectedThreadId(highRisk?.threadId || threads[0]?.threadId);
    }
  }, [threads, selectedThreadId, analyses]);

  // Group threads by severity
  const getThreadsByRisk = (level: 'High' | 'Medium' | 'Low') => {
    return threads.filter(t => {
      const analysis = analyses.get(t.threadId);
      return analysis && analysis.overallRiskLevel === level;
    }).filter(t => 
      searchTerm === '' || 
      t.threadId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const highRiskThreads = getThreadsByRisk('High');
  const mediumRiskThreads = getThreadsByRisk('Medium');
  const lowRiskThreads = getThreadsByRisk('Low');
  const totalAnalyzed = analyses.size;
  const analyzedSummaries: ThreadSecuritySummaryType[] = Array.from(analyses.values());
  const averageRisk = analyzedSummaries.length > 0
    ? Math.round(analyzedSummaries.reduce((sum, item) => sum + item.overallRisk, 0) / analyzedSummaries.length)
    : 0;
  const trustedThreads = analyzedSummaries.filter((item) => item.trustedDomain || item.confidenceLabel === 'High (Legitimate)').length;
  const bulkEmailThreads = analyzedSummaries.filter((item) => item.bulkEmailCandidate || item.attackType === 'Marketing / Bulk Email').length;
  const securityPostureLabel = averageRisk >= 60 ? 'Exposed' : averageRisk >= 30 ? 'Moderate' : 'Secure';
  const postureColor = averageRisk >= 60 ? 'text-red-600 bg-red-50' : averageRisk >= 30 ? 'text-yellow-600 bg-yellow-50' : 'text-emerald-600 bg-emerald-50';

  const SeverityGroup = ({ 
    level, 
    icon: Icon, 
    color, 
    threads: groupThreads, 
    bgColor 
  }: {
    level: 'High' | 'Medium' | 'Low';
    icon: React.ComponentType<any>;
    color: string;
    threads: Thread[];
    bgColor: string;
  }) => {
    return (
      <div className="space-y-1">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgColor} border-l-2 ${color.replace('text', 'border')}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{level} Risk</span>
          <span className={`ml-auto text-[10px] font-bold ${color}`}>{groupThreads.length}</span>
        </div>

        <div className="space-y-1">
          {groupThreads.map((thread) => {
            const analysis = analyses.get(thread.threadId);
            const isSelected = selectedThreadId === thread.threadId;
            const isAnalyzing = analyzing.has(thread.threadId);

            return (
              <button
                key={thread.threadId}
                onClick={() => setSelectedThreadId(thread.threadId)}
                className={cn(
                  'w-full text-left p-2 rounded-lg transition-all border',
                  isSelected
                    ? 'border-primary-500 bg-primary-50/50'
                    : 'border-transparent hover:bg-[var(--secondary)]/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-bold text-[var(--foreground)]">
                      {thread.participants[0]?.split('@')[0] || 'Unknown'}
                    </p>
                    <p className="truncate text-[9px] text-[var(--muted-foreground)] uppercase font-bold tracking-tighter">
                      {thread.threadId.substring(0, 8)} • {thread.emails.length} msg
                    </p>
                  </div>
                  {isAnalyzing ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
                  ) : (
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      level === 'High' ? 'bg-red-500' : level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                    )} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const reportCards = [
    { label: 'Threads analyzed', value: totalAnalyzed, icon: Layers3, tone: 'from-slate-500 to-slate-700', note: `${threads.length} total threads` },
    { label: 'Average risk', value: `${averageRisk}/100`, icon: Shield, tone: 'from-indigo-500 to-blue-600', note: securityPostureLabel },
    { label: 'Trusted threads', value: trustedThreads, icon: ShieldCheck, tone: 'from-emerald-500 to-green-600', note: 'Low concern conversations' },
    { label: 'Bulk email candidates', value: bulkEmailThreads, icon: Mail, tone: 'from-amber-500 to-orange-600', note: 'Newsletter-style traffic' },
  ];

  const handleRefresh = () => {
    if (!onAnalyzeThreads) return;
    // Clear cache and force re-analysis of all threads
    setAnalyses(new Map());
    analyzeAllThreads(threads);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[var(--background)] overflow-hidden">
      {/* Top Header & Mini Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Security Laboratory</h1>
            <div className={`mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${postureColor}`}>
              <ShieldCheck className="w-3 h-3" />
              Posture: {securityPostureLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {reportCards.slice(0, 3).map((card) => (
            <div key={card.label} className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">{card.label}</span>
              <span className="text-sm font-black">{card.value}</span>
            </div>
          ))}
          <div className="h-8 w-px bg-[var(--border)] mx-2 hidden lg:block" />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--secondary)] text-xs font-bold hover:bg-[var(--border)] transition-all disabled:opacity-50"
          >
            <Loader2 className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - Thread List */}
        <aside className="w-72 flex flex-col border-r border-[var(--border)] bg-[var(--card)]/50">
          <div className="p-3 border-b border-[var(--border)]">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter threads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs font-medium focus:ring-2 focus:ring-primary-500/20 outline-none"
              />
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            <SeverityGroup level="High" icon={AlertTriangle} color="text-red-500" bgColor="bg-red-50" threads={highRiskThreads} />
            <SeverityGroup level="Medium" icon={AlertCircle} color="text-yellow-500" bgColor="bg-yellow-50" threads={mediumRiskThreads} />
            <SeverityGroup level="Low" icon={CheckCircle} color="text-green-500" bgColor="bg-green-50" threads={lowRiskThreads} />
            {threads.length === 0 && (
              <div className="py-10 text-center text-[var(--muted-foreground)] opacity-50 space-y-2">
                <Layers3 className="w-8 h-8 mx-auto" />
                <p className="text-[10px] uppercase font-black">No Data</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Pane - Detail View */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
          {selectedAnalysis && selectedThread ? (
            <>
              {/* Internal Tab Nav */}
              <div className="px-6 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                <div className="flex gap-6">
                  <button 
                    onClick={() => setActiveView('summary')}
                    className={cn(
                      "py-4 text-xs font-bold transition-all relative",
                      activeView === 'summary' ? "text-primary-600" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    Executive Summary
                    {activeView === 'summary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />}
                  </button>
                  <button 
                    onClick={() => setActiveView('timeline')}
                    className={cn(
                      "py-4 text-xs font-bold transition-all relative",
                      activeView === 'timeline' ? "text-primary-600" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    Forensic Timeline
                    {activeView === 'timeline' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />}
                  </button>
                </div>
                
                <button
                  onClick={() => navigate(`/security-report/${selectedThread.threadId}`)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 text-[10px] font-black uppercase tracking-wider hover:bg-primary-50 transition-all"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  Full Report
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Distribution Bar always visible at top of detail */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Thread ID: {selectedThread.threadId}</span>
                      <span className="text-xs font-bold">Investigation Active</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--secondary)] rounded-full overflow-hidden flex">
                      <div className="h-full bg-red-500" style={{ width: `${selectedAnalysis.overallRisk}%` }} />
                      <div className="h-full bg-[var(--secondary)] flex-1" />
                    </div>
                  </div>

                  {activeView === 'summary' ? (
                    <ThreadSecuritySummary
                      summary={selectedAnalysis}
                      participantCount={selectedThread.participants.length}
                    />
                  ) : (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                      <SecurityTimeline summary={selectedAnalysis} autoExpandSuspicious={true} />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted-foreground)] opacity-40 p-12 text-center">
              <Shield className="w-16 h-16 mb-4" />
              <h2 className="text-xl font-bold">Investigative Selection Required</h2>
              <p className="max-w-xs mt-2 text-sm font-medium">Select a thread from the analysis repository to begin forensic review.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SecurityDashboard;
