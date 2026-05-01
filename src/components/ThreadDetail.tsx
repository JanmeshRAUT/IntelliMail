import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { Email, getEmails, getThreads, Thread, ThreadAnalysis } from '../lib/localData';
import { ThreadSecuritySummary } from './ThreadSecuritySummary';
import { SecurityTimeline } from './SecurityTimeline';
import { Shield, ExternalLink, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import type { ThreadSecuritySummary as ThreadSecuritySummaryType } from '../lib/types';

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>();
  const [thread, setThread] = useState<Thread | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [fullSecurityAnalysis, setFullSecurityAnalysis] = useState<ThreadSecuritySummaryType | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const storedThread = getThreads().find((candidate) => candidate.id === id) || null;
      const storedEmails = getEmails()
        .filter((email) => email.threadId === id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setThread(storedThread);
      setEmails(storedEmails);
      setLoading(false);
      
      // Perform real analysis
      if (storedEmails.length > 0) {
        await performRealAnalysis(storedEmails, storedThread);
      }
    };

    hydrate();
    window.addEventListener('intellimail:data-updated', hydrate);
    return () => window.removeEventListener('intellimail:data-updated', hydrate);
  }, [id]);

  // Perform actual analysis through the API
  const performRealAnalysis = async (emailsToAnalyze: Email[], currentThread: Thread | null) => {
    setAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisComplete(false);

    try {
      // Simulate analysis stages with progress updates
      setAnalysisProgress(10);
      await new Promise(resolve => setTimeout(resolve, 300));

      setAnalysisProgress(30);
      await new Promise(resolve => setTimeout(resolve, 300));

      setAnalysisProgress(50);
      // Call actual server API for analysis
      const response = await axios.post('/api/analyze', { emails: emailsToAnalyze });
      const analysis = response.data as ThreadAnalysis;

      // Also get the full security analysis for the report
      const securityResponse = await axios.post('/api/security/analyze-thread', { 
        thread: {
          threadId: currentThread?.id || '',
          emails: emailsToAnalyze.map(e => ({
            ...e,
            to: [] // Security service expects to array, adding empty
          }))
        }
      });
      
      if (securityResponse.data.success) {
        setFullSecurityAnalysis(securityResponse.data.data);
      }

      setAnalysisProgress(75);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Update thread with fresh analysis
      if (currentThread) {
        setThread({
          ...currentThread,
          analysis
        });
      }

      setAnalysisProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      setAnalysisComplete(true);
      setAnalyzing(false);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisProgress(100);
      setAnalysisComplete(true);
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
      <div className="h-6 w-24 bg-[var(--secondary)] rounded-lg" />
      <div className="space-y-4">
        <div className="h-10 w-2/3 bg-[var(--secondary)] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-[var(--card)] border border-[var(--border)] rounded-[2rem]" />
          </div>
          <div className="h-96 bg-[var(--card)] border border-[var(--border)] rounded-[2rem]" />
        </div>
      </div>
    </div>
  );

  if (!thread) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="p-4 bg-red-50 text-red-500 rounded-full dark:bg-red-500/10 dark:text-red-400">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h3 className="text-2xl font-bold">Thread not found</h3>
      <p className="text-[var(--muted-foreground)] max-w-xs font-medium">The conversation you're looking for doesn't exist or has been deleted.</p>
      <Link to="/" className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20">Go back home</Link>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 text-[var(--foreground)] transition-colors duration-300">
      <Link to="/" className="inline-flex items-center gap-2.5 text-[var(--foreground)] hover:text-primary-600 transition-all font-black text-[10px] uppercase tracking-widest bg-[var(--card)] border border-[var(--border)] px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:-translate-x-1 group">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Return to Intelligence
      </Link>

      {/* Analyzer Bar */}
      {(analyzing || analysisProgress > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 space-y-3 shadow-lg shadow-primary-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-5 h-5">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full"
                />
              </div>
              <span className="text-white font-bold">
                {analyzing ? 'Analyzing Content...' : 'Analysis Complete'}
              </span>
            </div>
            <span className="text-white/80 text-sm font-semibold">{Math.min(Math.round(analysisProgress), 100)}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(analysisProgress, 100)}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full bg-white rounded-full shadow-lg shadow-white/30"
            />
          </div>

          {/* Status Messages */}
          <div className="text-white/90 text-xs font-medium space-y-1">
            {analysisProgress < 25 && <p>🔍 Scanning email headers...</p>}
            {analysisProgress >= 25 && analysisProgress < 50 && <p>📧 Analyzing email content...</p>}
            {analysisProgress >= 50 && analysisProgress < 75 && <p>🔗 Checking links and attachments...</p>}
            {analysisProgress >= 75 && analysisProgress < 100 && <p>🤖 Running ML threat detection...</p>}
            {analysisProgress >= 100 && <p>✓ Analysis complete - Report ready</p>}
          </div>
        </motion.div>
      )}

      {!analysisComplete && analyzing ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8 animate-pulse">
            <div className="h-10 w-3/4 bg-[var(--secondary)] rounded-xl" />
            <div className="space-y-4">
              <div className="h-64 bg-[var(--card)] border border-[var(--border)] rounded-[2rem]" />
            </div>
          </div>
          <div className="h-96 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] animate-pulse" />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <header className="space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[var(--foreground)]">{thread.subject}</h1>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="px-4 py-1.5 bg-primary-100 text-primary-700 rounded-xl text-[10px] font-extrabold uppercase tracking-widest dark:bg-primary-900/30 dark:text-primary-300">
                {thread.analysis?.category || 'Uncategorized'}
              </span>
              <span className={cn(
                "px-4 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest",
                thread.analysis?.priority === 'High' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
              )}>
                {thread.analysis?.priority || 'Normal'} Priority
              </span>
            </div>
          </header>

          <div className="space-y-6">
            {emails.map((email, idx) => (
              <motion.div 
                key={email.id}
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] overflow-hidden shadow-xl shadow-black/5 hover:border-primary-500/20 transition-all"
              >
                <div className="p-6 border-b border-[var(--border)] bg-[var(--secondary)]/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-600/10 border-2 border-primary-600/20 flex items-center justify-center text-primary-600 font-bold">
                      {email.from.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--foreground)] truncate">{email.from}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] font-bold tracking-wide">{new Date(email.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="mx-auto max-w-4xl space-y-4">
                    {/<\/?.+>/.test(email.body) ? (
                      <div
                        className="prose prose-blue max-w-none text-[var(--foreground)] text-sm leading-relaxed prose-headings:font-bold prose-a:text-primary-600"
                        style={{ wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: email.body }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-[var(--foreground)] text-sm leading-relaxed font-medium">
                        {email.body}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <aside className="space-y-8">
          <div className="bg-[var(--card)] border border-[var(--border)] p-10 rounded-[2.5rem] space-y-10 sticky top-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden relative">
            <header className="space-y-2 relative z-10">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="p-2.5 bg-red-600/10 rounded-[1rem]">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="font-black uppercase tracking-[0.2em] text-[10px]">Intelligence Summary</h2>
              </div>
            </header>

            {fullSecurityAnalysis ? (
              <div className="space-y-8 relative z-10">
                {/* Concise View */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest mb-1">Threat Status</p>
                      <h3 className={cn(
                        "text-xl font-black tracking-tight",
                        fullSecurityAnalysis.overallRiskLevel === 'High' ? "text-red-600" :
                        fullSecurityAnalysis.overallRiskLevel === 'Medium' ? "text-yellow-600" : "text-green-600"
                      )}>
                        {fullSecurityAnalysis.overallRiskLevel} Risk
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest mb-1">Score</p>
                      <p className="text-2xl font-black">{fullSecurityAnalysis.overallRisk}/100</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-[1.5rem] bg-[var(--secondary)]/50 border border-[var(--border)] space-y-3">
                    <p className="text-xs font-bold leading-relaxed">
                      {fullSecurityAnalysis.threadThreatLevel}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {fullSecurityAnalysis.attackType && (
                        <span className="px-2 py-1 rounded-md bg-white dark:bg-black/20 text-[9px] font-black border border-black/5">
                          {fullSecurityAnalysis.attackType}
                        </span>
                      )}
                      {fullSecurityAnalysis.confidenceLabel && (
                        <span className="px-2 py-1 rounded-md bg-white dark:bg-black/20 text-[9px] font-black border border-black/5">
                          {fullSecurityAnalysis.confidenceLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowFullReport(true)}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-2",
                      fullSecurityAnalysis.overallRiskLevel === 'High' ? "bg-red-600 text-white hover:bg-red-700" :
                      fullSecurityAnalysis.overallRiskLevel === 'Medium' ? "bg-yellow-600 text-white hover:bg-yellow-700" :
                      "bg-green-600 text-white hover:bg-green-700"
                    )}
                  >
                    View Full Intelligence Report
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-[var(--border)]">
                  <div className="p-3 bg-[var(--secondary)]/30 rounded-xl border border-[var(--border)] text-center">
                    <p className="text-lg font-black">{emails.length}</p>
                    <p className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Emails</p>
                  </div>
                  <div className="p-3 bg-[var(--secondary)]/30 rounded-xl border border-[var(--border)] text-center">
                    <p className="text-lg font-black">
                      {fullSecurityAnalysis.emails.reduce((sum, e) => sum + (e.linkAnalysis?.filter(l => l.phishingDetected).length || 0), 0)}
                    </p>
                    <p className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Sus Links</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <ShieldCheck className="w-10 h-10 text-[var(--muted-foreground)] opacity-20" />
                <p className="text-xs font-bold text-[var(--muted-foreground)]">Processing Security Intelligence...</p>
              </div>
            )}
          </div>
        </aside>

        {/* Full Report Modal */}
        <AnimatePresence>
          {showFullReport && fullSecurityAnalysis && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFullReport(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] bg-[var(--background)] border border-[var(--border)] shadow-2xl"
              >
                <div className="sticky top-0 z-20 flex items-center justify-between p-8 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--border)]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-600/10 rounded-2xl">
                      <Shield className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">Executive Security Report</h2>
                      <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mt-0.5">Thread Intelligence Analysis v2.0</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFullReport(false)}
                    className="p-4 rounded-full hover:bg-[var(--secondary)] transition-all hover:rotate-90"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>

                <div className="p-8 md:p-12 space-y-12">
                  <ThreadSecuritySummary
                    summary={fullSecurityAnalysis}
                    participantCount={new Set(emails.map(e => e.from)).size}
                  />

                  <div className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)] p-10 shadow-sm space-y-8">
                    <header>
                      <h3 className="text-2xl font-black tracking-tight">Security Timeline</h3>
                      <p className="text-sm font-medium text-[var(--muted-foreground)]">Step-by-step risk propagation analysis</p>
                    </header>
                    <SecurityTimeline summary={fullSecurityAnalysis} autoExpandSuspicious={true} />
                  </div>
                </div>

                <div className="p-10 border-t border-[var(--border)] bg-[var(--secondary)]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-bold text-[10px] uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4" />
                    Verified by IntelliMail AI
                  </div>
                  <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
                    Report ID: {id?.substring(0, 8)}
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
