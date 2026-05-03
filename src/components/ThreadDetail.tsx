import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { Email, getEmails, getThreads, Thread, ThreadAnalysis, getUser } from '../lib/localData';
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
      const user = getUser();
      const response = await axios.post('/api/analyze', { 
        emails: emailsToAnalyze,
        userId: user?.id 
      });
      const analysis = response.data as ThreadAnalysis;

      // Also get the full security analysis for the report
      const securityResponse = await axios.post('/api/security/analyze-thread', { 
        userId: user?.id,
        thread: {
          threadId: currentThread?.id || '',
          emails: emailsToAnalyze.map(e => ({
            ...e,
            to: [] // Security service expects to array, adding empty
          }))
        }
      });
      
      const securityPayload = securityResponse.data as { success?: boolean; data?: ThreadSecuritySummaryType; error?: string };
      
      if (securityPayload.success && securityPayload.data) {
        setFullSecurityAnalysis(securityPayload.data);
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold hover:text-primary-600 transition-all group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Inbox
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--secondary)] border border-[var(--border)]">
              <div className={cn(
                "w-2 h-2 rounded-full",
                analyzing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {analyzing ? 'System Analyzing' : 'Intelligence Secured'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Subtle Analysis Progress Line */}
        {analyzing && (
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary-100 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${analysisProgress}%` }}
              className="h-full bg-primary-600"
            />
          </div>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-10 lg:border-r border-[var(--border)]">
          {!analysisComplete && analyzing ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-12 w-3/4 bg-[var(--secondary)] rounded-2xl" />
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="h-64 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem]" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10 max-w-4xl mx-auto">
              <header className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-[9px] font-black uppercase tracking-[0.2em] dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200/50">
                    {thread.analysis?.category || 'General'}
                  </span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border",
                    thread.analysis?.priority === 'High' 
                      ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/40" 
                      : "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
                  )}>
                    {thread.analysis?.priority || 'Standard'} Priority
                  </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-[var(--foreground)]">
                  {thread.subject}
                </h1>
              </header>

              <div className="space-y-8">
                {emails.map((email, idx) => (
                  <motion.div 
                    key={email.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/[0.02] hover:border-primary-500/30 transition-all group"
                  >
                    <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--secondary)]/20 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/20">
                          {email.from.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[var(--foreground)]">{email.from}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] font-bold tracking-widest uppercase mt-0.5">
                            {new Date(email.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-8 lg:p-12">
                      <div className="prose prose-slate max-w-none dark:prose-invert">
                        {/<\/?.+>/.test(email.body) ? (
                          <div
                            className="text-[var(--foreground)] text-[15px] leading-relaxed"
                            style={{ wordBreak: 'break-word' }}
                            dangerouslySetInnerHTML={{ __html: email.body }}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-[var(--foreground)] text-[15px] leading-relaxed font-medium">
                            {email.body}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Intelligence Sidebar */}
        <aside className="w-full lg:w-[450px] bg-[var(--secondary)]/20 lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 overflow-y-auto">
          <div className="p-8 lg:p-10 space-y-10">
            {/* Main Score Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-8 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary-600/10 rounded-xl">
                      <Shield className="w-5 h-5 text-primary-600" />
                    </div>
                    <h2 className="font-black uppercase tracking-[0.2em] text-[10px] text-[var(--muted-foreground)]">Threat Intelligence</h2>
                  </div>
                  {fullSecurityAnalysis && (
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      fullSecurityAnalysis.overallRiskLevel === 'High' ? "bg-red-500 text-white" :
                      fullSecurityAnalysis.overallRiskLevel === 'Medium' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                    )}>
                      {fullSecurityAnalysis.overallRiskLevel}
                    </div>
                  )}
                </div>

                {analyzing && !fullSecurityAnalysis ? (
                  <div className="py-10 flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-[var(--border)] stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                        <motion.circle 
                          className="text-primary-600 stroke-current" 
                          strokeWidth="8" 
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * analysisProgress) / 100}
                          strokeLinecap="round" 
                          fill="transparent" 
                          r="40" cx="50" cy="50" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black">{Math.round(analysisProgress)}%</span>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest text-primary-600">AI Engines Working</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] font-bold">Scanning for advanced phishing patterns</p>
                    </div>
                  </div>
                ) : fullSecurityAnalysis ? (
                  <div className="space-y-8">
                    <div className="flex items-end justify-between border-b border-[var(--border)] pb-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Risk Profile</p>
                        <h3 className="text-3xl font-black tracking-tighter">
                          {fullSecurityAnalysis.overallRiskLevel} Potential
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Confidence</p>
                        <p className="text-3xl font-black tracking-tighter text-primary-600">
                          {fullSecurityAnalysis.overallRisk}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-[var(--secondary)]/40 border border-[var(--border)]">
                        <p className="text-xs font-bold leading-relaxed text-[var(--foreground)]">
                          {fullSecurityAnalysis.threadThreatLevel}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
                          <p className="text-xl font-black">{emails.length}</p>
                          <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Thread Depth</p>
                        </div>
                        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
                          <p className="text-xl font-black text-red-600">
                            {fullSecurityAnalysis.emails.reduce((sum, e) => sum + (e.linkAnalysis?.filter(l => l.phishingDetected).length || 0), 0)}
                          </p>
                          <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Flagged Links</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowFullReport(true)}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group shadow-lg",
                        fullSecurityAnalysis.overallRiskLevel === 'High' ? "bg-red-600 text-white hover:bg-red-700 shadow-red-500/20" :
                        fullSecurityAnalysis.overallRiskLevel === 'Medium' ? "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-500/20" :
                        "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20"
                      )}
                    >
                      View Forensic Report
                      <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Signal Feed */}
            {fullSecurityAnalysis && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 bg-primary-600 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Critical Signals</h3>
                </div>
                <div className="space-y-3">
                  {fullSecurityAnalysis.attackType && (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Vector</p>
                        <p className="text-xs font-bold">{fullSecurityAnalysis.attackType}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Origin</p>
                      <p className="text-xs font-bold">{fullSecurityAnalysis.trustedDomain ? 'Verified Domain' : 'Untrusted Source'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Forensic Report Modal */}
        <AnimatePresence>
          {showFullReport && fullSecurityAnalysis && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFullReport(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="relative w-full max-w-[1200px] max-h-[90vh] overflow-y-auto rounded-[3rem] bg-[var(--background)] border border-[var(--border)] shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              >
                <div className="sticky top-0 z-30 flex items-center justify-between p-8 lg:px-12 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--border)]">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary-500/40">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tight">Intelligence Forensic Report</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Active Analysis v3.2</span>
                        <div className="w-1 h-1 bg-[var(--muted-foreground)] rounded-full" />
                        <span className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">System Secured</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFullReport(false)}
                    className="p-4 rounded-2xl bg-[var(--secondary)] hover:bg-red-500 hover:text-white transition-all hover:rotate-90 group"
                  >
                    <X className="w-6 h-6 transition-transform group-hover:scale-110" />
                  </button>
                </div>

                <div className="p-8 lg:p-12 space-y-16">
                  <ThreadSecuritySummary
                    summary={fullSecurityAnalysis}
                    participantCount={new Set(emails.map(e => e.from)).size}
                  />

                  <div className="space-y-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">Security Timeline</h3>
                        <p className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Deep packet and behavioral analysis log</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-100/50 border border-primary-200 dark:bg-primary-900/20 dark:border-primary-900/40">
                        <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-700 dark:text-primary-300">Live Trace</span>
                      </div>
                    </div>
                    <div className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)] p-10 shadow-inner">
                      <SecurityTimeline summary={fullSecurityAnalysis} autoExpandSuspicious={true} />
                    </div>
                  </div>
                </div>

                <div className="p-12 border-t border-[var(--border)] bg-[var(--secondary)]/30 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.2em] max-w-[200px]">
                      This report was generated by the IntelliMail AI Neural Engine.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Scan Signature</p>
                    <p className="text-xs font-mono font-bold mt-1 text-primary-600">{id?.toUpperCase()}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
