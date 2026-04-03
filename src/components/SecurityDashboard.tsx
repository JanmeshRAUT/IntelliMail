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
  const [analyses, setAnalyses] = useState<Map<string, ThreadSecuritySummaryType>>(new Map());
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(new Set<string>());
  const [searchTerm, setSearchTerm] = useState('');

  const isAnalysisStale = (thread: Thread, analysis?: ThreadSecuritySummaryType) => {
    if (!analysis) {
      return true;
    }
    return analysis.emails.length !== thread.emails.length;
  };

  // Restore cached analyses when returning from other pages.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ANALYSIS_CACHE_KEY);
      if (!raw) {
        return;
      }

      const entries = JSON.parse(raw) as Array<[string, ThreadSecuritySummaryType]>;
      setAnalyses(new Map(entries));
    } catch {
      // Ignore cache parse failures.
    }
  }, []);

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
  const suspiciousLinkCount = analyzedSummaries.reduce(
    (sum, item) => sum + item.emails.reduce((emailSum, email) => emailSum + (email.linkAnalysis?.filter((link) => link.phishingDetected).length || email.threats.length), 0),
    0
  );
  const securityPostureLabel = averageRisk >= 60 ? 'Elevated exposure' : averageRisk >= 30 ? 'Moderate monitoring' : 'Controlled posture';

  // Severity group component
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
    const isExpanded = true; // Always expand
    
    return (
      <div className="space-y-2">
        {/* Group Header */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${bgColor} border-l-4 ${color.replace('text', 'border')}`}>
          <Icon className={`w-5 h-5 ${color}`} />
          <span className={`font-bold ${color}`}>{level} Risk</span>
          <span className={`ml-auto text-sm font-semibold ${color}`}>
            {groupThreads.length}
          </span>
        </div>

        {/* Group Items */}
        {isExpanded && groupThreads.length > 0 && (
          <div className="space-y-2 pl-2">
            {groupThreads.map((thread) => {
              const analysis = analyses.get(thread.threadId);
              const isSelected = selectedThreadId === thread.threadId;
              const isAnalyzing = analyzing.has(thread.threadId);

              return (
                <button
                  key={thread.threadId}
                  onClick={() => setSelectedThreadId(thread.threadId)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border-2 transition-all',
                    isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-500/10'
                      : 'border-[var(--border)] hover:border-primary-300'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Thread ID */}
                      <p className="truncate font-mono text-xs text-[var(--muted-foreground)]">
                        {thread.threadId.substring(0, 12)}...
                      </p>
                      {/* Participants */}
                      <p className="truncate text-sm font-medium text-[var(--foreground)] mt-1">
                        {thread.participants[0]?.split('@')[0] || 'Unknown'}
                      </p>
                      {/* Email count */}
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {thread.emails.length} {thread.emails.length === 1 ? 'email' : 'emails'}
                      </p>
                    </div>

                    {/* Status indicator */}
                    <div className="shrink-0">
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      ) : analysis ? (
                        <span className={cn(
                          'inline-block w-2 h-2 rounded-full',
                          analysis.overallRiskLevel === 'High' ? 'bg-red-500' :
                          analysis.overallRiskLevel === 'Medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        )} />
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state for group */}
        {isExpanded && groupThreads.length === 0 && (
          <p className="text-xs text-[var(--muted-foreground)] px-4 py-2 italic">No threads</p>
        )}
      </div>
    );
  };

  const cn = (...args: any[]) => args.filter(Boolean).join(' ');

  const reportCards = [
    { label: 'Threads analyzed', value: totalAnalyzed, icon: Layers3, tone: 'from-slate-500 to-slate-700', note: `${threads.length} total threads` },
    { label: 'Average risk', value: `${averageRisk}/100`, icon: Shield, tone: 'from-indigo-500 to-blue-600', note: securityPostureLabel },
    { label: 'Trusted threads', value: trustedThreads, icon: ShieldCheck, tone: 'from-emerald-500 to-green-600', note: 'Low concern conversations' },
    { label: 'Bulk email candidates', value: bulkEmailThreads, icon: Mail, tone: 'from-amber-500 to-orange-600', note: 'Newsletter-style traffic' },
  ];

  return (
    <div className="min-h-full bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/8 via-transparent to-emerald-500/8" />
          <div className="relative p-8 lg:p-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300">
                <Sparkles className="w-3.5 h-3.5" />
                Security Intelligence Report
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                <Shield className="w-9 h-9 text-primary-600" />
                Email Security Analyzer
              </h1>
              <p className="text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
                Executive view of thread risk, trusted bulk communications, and phishing indicators.
                {totalAnalyzed > 0
                  ? ` ${totalAnalyzed} thread${totalAnalyzed !== 1 ? 's' : ''} analyzed from ${threads.length} total.`
                  : ` Ready to analyze ${threads.length} thread${threads.length !== 1 ? 's' : ''}.`}
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3">
              {loading ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing threads
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  {securityPostureLabel}
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                <ArrowUpRight className="w-4 h-4" />
                {suspiciousLinkCount} suspicious link{ suspiciousLinkCount === 1 ? '' : 's' } identified
              </div>
            </div>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {reportCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.tone}`} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{card.label}</p>
                    <p className="mt-3 text-3xl font-black text-[var(--foreground)]">{card.value}</p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">{card.note}</p>
                  </div>
                  <div className={`rounded-2xl bg-gradient-to-br ${card.tone} p-3 text-white shadow-lg`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[26rem_minmax(0,1fr)] gap-6 items-start">
          {/* Left Panel - Grouped Threads */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">Search report</label>
              <input
                type="text"
                placeholder="Search threads or participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Severity Breakdown</h2>
                <span className="text-xs text-[var(--muted-foreground)]">{threads.length} total</span>
              </div>

              <div className="space-y-4">
                <SeverityGroup
                  level="High"
                  icon={AlertTriangle}
                  color="text-red-600 dark:text-red-400"
                  bgColor="bg-red-50 dark:bg-red-500/10"
                  threads={highRiskThreads}
                />

                <SeverityGroup
                  level="Medium"
                  icon={AlertCircle}
                  color="text-yellow-600 dark:text-yellow-400"
                  bgColor="bg-yellow-50 dark:bg-yellow-500/10"
                  threads={mediumRiskThreads}
                />

                <SeverityGroup
                  level="Low"
                  icon={CheckCircle}
                  color="text-green-600 dark:text-green-400"
                  bgColor="bg-green-50 dark:bg-green-500/10"
                  threads={lowRiskThreads}
                />
              </div>
            </div>

            {threads.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
                <Zap className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2 opacity-50" />
                <p className="text-[var(--muted-foreground)] font-medium">No threads to analyze</p>
              </div>
            )}
          </div>

          {/* Right Panel - Details */}
          <div className="space-y-6 min-w-0">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Risk Distribution</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Threads grouped by severity and ML-backed link analysis</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-[var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />High {highRiskThreads.length}</span>
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />Medium {mediumRiskThreads.length}</span>
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />Low {lowRiskThreads.length}</span>
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--secondary)]">
                <div className="flex h-full">
                  <div className="bg-red-500" style={{ width: `${threads.length > 0 ? (highRiskThreads.length / threads.length) * 100 : 0}%` }} />
                  <div className="bg-yellow-500" style={{ width: `${threads.length > 0 ? (mediumRiskThreads.length / threads.length) * 100 : 0}%` }} />
                  <div className="bg-green-500" style={{ width: `${threads.length > 0 ? (lowRiskThreads.length / threads.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {selectedAnalysis && selectedThread ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Report Actions</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Open a structured report view for stakeholders</p>
                  </div>
                  <button
                    onClick={() => navigate(`/security-report/${selectedThread.threadId}`)}
                    className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    Open Structured Report
                  </button>
                </div>

                <ThreadSecuritySummary
                  summary={selectedAnalysis}
                  participantCount={selectedThread.participants.length}
                />

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-black tracking-tight">Detailed Timeline</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">Email-by-email scoring with link verdicts</p>
                    </div>
                    <div className="text-right text-xs text-[var(--muted-foreground)]">
                      {selectedAnalysis.confidenceLabel ? selectedAnalysis.confidenceLabel : selectedAnalysis.attackType || 'Thread review'}
                    </div>
                  </div>

                  <SecurityTimeline summary={selectedAnalysis} autoExpandSuspicious={true} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-12 shadow-sm text-center">
                <Shield className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold text-[var(--foreground)]">Select a thread to view the report</p>
                <p className="text-[var(--muted-foreground)] mt-1">Open any thread to review the executive summary and timeline</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
