import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { Email, getEmails, getThreads, Thread } from '../lib/localData';

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>();
  const [thread, setThread] = useState<Thread | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = () => {
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
    };

    hydrate();
    window.addEventListener('intellimail:data-updated', hydrate);
    return () => window.removeEventListener('intellimail:data-updated', hydrate);
  }, [id]);

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
          <div className="bg-[var(--card)] border border-[var(--border)] p-10 rounded-[2.5rem] space-y-10 sticky top-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-300">
            <header className="space-y-2">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="p-2.5 bg-red-600/10 rounded-[1rem]">
                  <ShieldAlert className="w-5 h-5 fill-current" />
                </div>
                <h2 className="font-black uppercase tracking-[0.2em] text-[10px]">Security Report</h2>
              </div>
            </header>

            <div className="space-y-10">
              {/* Overall Risk Assessment */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <h3 className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Overall Risk Level</h3>
                </div>
                <div className={cn(
                  "p-5 rounded-[1.5rem] border-2 space-y-3",
                  thread.analysis?.priority === 'High' 
                    ? "bg-red-50/50 dark:bg-red-500/5 border-red-500/30 dark:border-red-500/30"
                    : thread.analysis?.priority === 'Medium'
                    ? "bg-amber-50/50 dark:bg-amber-500/5 border-amber-500/30 dark:border-amber-500/30"
                    : "bg-green-50/50 dark:bg-green-500/5 border-green-500/30 dark:border-green-500/30"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full",
                      thread.analysis?.priority === 'High' ? "bg-red-500" :
                      thread.analysis?.priority === 'Medium' ? "bg-amber-500" : "bg-green-500"
                    )} />
                    <span className="text-sm font-black tracking-tight">{thread.analysis?.priority || 'Low'} Risk</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] font-semibold opacity-80">
                    {thread.analysis?.threats && thread.analysis.threats.length > 0 
                      ? `${thread.analysis.threats.length} security threat${thread.analysis.threats.length !== 1 ? 's' : ''} detected`
                      : 'No threats detected in this conversation'}
                  </p>
                </div>
              </div>

              {/* Threat Summary */}
              {thread.analysis?.threats && thread.analysis.threats.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <h3 className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Detected Threats</h3>
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg text-[9px] font-bold">
                      {thread.analysis.threats.length}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {thread.analysis.threats.map((threat, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-red-50/50 dark:bg-red-500/5 rounded-lg border border-red-200/30 dark:border-red-500/20">
                        <div className="mt-1 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 shadow-lg shadow-red-500/50" />
                        <span className="text-xs text-[var(--foreground)] font-bold leading-relaxed">{threat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <h3 className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Status</h3>
                  </div>
                  <div className="p-4 bg-green-50/50 dark:bg-green-500/5 rounded-lg border border-green-200/30 dark:border-green-500/20 flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-300">No threats detected</span>
                  </div>
                </div>
              )}

              {/* Email Analysis */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <h3 className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Email Scan</h3>
                  <span className="text-xs font-bold text-[var(--muted-foreground)]">{emails.length} email{emails.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {emails.map((email, idx) => {
                    const hasThreats = thread.analysis?.threats && thread.analysis.threats.length > 0;
                    return (
                      <div key={email.id} className="p-3 bg-[var(--secondary)]/30 rounded-lg border border-[var(--border)] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--foreground)] truncate">{email.from.split('@')[0]}</span>
                          <span className={cn(
                            "px-2 py-1 rounded text-[9px] font-bold",
                            hasThreats && idx === 0 
                              ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                              : "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                          )}>
                            {hasThreats && idx === 0 ? 'THREAT' : 'SAFE'}
                          </span>
                        </div>
                        <p className="text-[var(--muted-foreground)] text-[10px]">
                          {new Date(email.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <h3 className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Recommendations</h3>
                </div>
                <ul className="space-y-2 text-xs text-[var(--foreground)] font-semibold">
                  {thread.analysis?.priority === 'High' && (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 font-bold mt-0.5">•</span>
                        <span>Do not click any links or download attachments</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 font-bold mt-0.5">•</span>
                        <span>Report to your IT security team immediately</span>
                      </li>
                    </>
                  )}
                  {thread.analysis?.priority === 'Medium' && (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        <span>Verify sender identity before taking action</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        <span>Be cautious with personal information</span>
                      </li>
                    </>
                  )}
                  {!thread.analysis?.priority || thread.analysis.priority === 'Low' && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold mt-0.5">•</span>
                      <span>This conversation appears safe to proceed</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
