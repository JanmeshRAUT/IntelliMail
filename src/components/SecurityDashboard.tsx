import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, AlertCircle, CheckCircle, Zap, Loader2 } from 'lucide-react';
import { ThreadSecuritySummary } from './ThreadSecuritySummary';
import { SecurityTimeline } from './SecurityTimeline';
import type { Thread, ThreadSecuritySummary as ThreadSecuritySummaryType } from '../lib/types';

interface SecurityDashboardProps {
  threads: Thread[];
  onAnalyzeThreads?: (threads: Thread[]) => Promise<ThreadSecuritySummaryType[]>;
}

/**
 * Main Security Dashboard - Integrates all security analysis components with severity grouping
 */
export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  threads,
  onAnalyzeThreads,
}) => {
  const [analyses, setAnalyses] = useState<Map<string, ThreadSecuritySummaryType>>(new Map());
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(new Set<string>());
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-analyze all threads when component mounts or threads change
  useEffect(() => {
    if (onAnalyzeThreads && threads.length > 0) {
      analyzeAllThreads();
    }
  }, [threads.length]); // Only re-analyze when thread count changes

  const analyzeAllThreads = async () => {
    if (!onAnalyzeThreads || threads.length === 0) return;

    setLoading(true);
    setAnalyzing(new Set(threads.map(t => t.threadId)));
    
    try {
      // Analyze in batches to avoid overwhelming the server
      const batchSize = 5;
      const results: ThreadSecuritySummaryType[] = [];
      
      for (let i = 0; i < threads.length; i += batchSize) {
        const batch = threads.slice(i, i + batchSize);
        const batchResults = await onAnalyzeThreads(batch);
        results.push(...batchResults);
        
        // Update analyzing set as batches complete
        setAnalyzing(prev => {
          const updated = new Set(prev);
          batch.forEach(t => updated.delete(t.threadId));
          return updated;
        });
      }
      
      const map = new Map();
      results.forEach((result) => {
        map.set(result.threadId, result);
      });
      setAnalyses(map);
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

  return (
    <div className="flex h-screen flex-col gap-4 bg-[var(--background)] text-[var(--foreground)] transition-colors">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary-600" />
                Email Security Analyzer
              </h1>
              <p className="text-[var(--muted-foreground)] mt-1">
                {totalAnalyzed > 0 
                  ? `Analyzed ${totalAnalyzed} of ${threads.length} threads` 
                  : `Ready to analyze ${threads.length} thread${threads.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="text-right">
              {loading && (
                <div className="flex items-center gap-2 text-primary-600 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-4 px-8 pb-8">
        {/* Left Panel - Grouped Threads */}
        <div className="w-96 flex flex-col gap-4 overflow-y-auto">
          {/* Search */}
          <div className="flex-shrink-0">
            <input
              type="text"
              placeholder="Search threads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          {/* Severity Groups */}
          <div className="space-y-4 flex-1">
            {/* High Risk */}
            <SeverityGroup
              level="High"
              icon={AlertTriangle}
              color="text-red-600 dark:text-red-400"
              bgColor="bg-red-50 dark:bg-red-500/10"
              threads={highRiskThreads}
            />

            {/* Medium Risk */}
            <SeverityGroup
              level="Medium"
              icon={AlertCircle}
              color="text-yellow-600 dark:text-yellow-400"
              bgColor="bg-yellow-50 dark:bg-yellow-500/10"
              threads={mediumRiskThreads}
            />

            {/* Low Risk */}
            <SeverityGroup
              level="Low"
              icon={CheckCircle}
              color="text-green-600 dark:text-green-400"
              bgColor="bg-green-50 dark:bg-green-500/10"
              threads={lowRiskThreads}
            />
          </div>

          {/* Empty State */}
          {threads.length === 0 && (
            <div className="flex items-center justify-center h-32 bg-[var(--card)] rounded-lg border border-[var(--border)] border-dashed">
              <div className="text-center">
                <Zap className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2 opacity-50" />
                <p className="text-[var(--muted-foreground)] font-medium">No threads to analyze</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Details */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedAnalysis && selectedThread ? (
            <div className="space-y-4 overflow-y-auto">
              {/* Thread Security Summary */}
              <ThreadSecuritySummary
                summary={selectedAnalysis}
                participantCount={selectedThread.participants.length}
              />

              {/* Security Timeline */}
              <SecurityTimeline summary={selectedAnalysis} autoExpandSuspicious={true} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[var(--card)] rounded-lg border border-[var(--border)] border-dashed">
              <div className="text-center">
                <Shield className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold text-[var(--foreground)]">Select a thread to view details</p>
                <p className="text-[var(--muted-foreground)] mt-1">Click on any thread from the list to analyze it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
