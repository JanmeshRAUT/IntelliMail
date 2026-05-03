import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, ShieldAlert, Zap, Search } from 'lucide-react';
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
              <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
                <div className="p-2.5 bg-primary-600/10 rounded-[1rem]">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <h2 className="font-black uppercase tracking-[0.2em] text-[10px]">Cognitive Profile</h2>
              </div>
            </header>

            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <h3 className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Narrative Synthesis</h3>
                </div>
                <p className="text-sm leading-relaxed text-[var(--foreground)] font-semibold opacity-90">
                  {thread.analysis?.summary || "Deep synthesis pending synchronization..."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <h3 className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">Sentiment Resonance</h3>
                </div>
                <div className="bg-[var(--secondary)]/40 p-5 rounded-[1.5rem] border border-[var(--border)] flex items-center gap-4 transition-all hover:border-primary-500/30">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full ring-4 ring-offset-2 ring-offset-[var(--card)]",
                    thread.analysis?.sentiment === 'Positive' ? "bg-emerald-500 ring-emerald-500/20 shadow-lg shadow-emerald-500/40" :
                    thread.analysis?.sentiment === 'Negative' ? "bg-rose-500 ring-rose-500/20 shadow-lg shadow-rose-500/40" : "bg-blue-500 ring-blue-500/20 shadow-lg shadow-blue-500/40"
                  )} />
                  <span className="text-sm font-black text-[var(--foreground)] tracking-tight">{thread.analysis?.sentiment || 'Neutral Stability'}</span>
                </div>
              </div>

              {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                <div className="p-8 bg-rose-500/5 border-2 border-rose-500/10 rounded-[2rem] space-y-5">
                  <div className="flex items-center gap-3 text-rose-600">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Intelligence Advisory</h3>
                  </div>
                  <ul className="space-y-4">
                    {thread.analysis.threats.map((t, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-[var(--foreground)] font-bold leading-relaxed">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 shadow-lg shadow-rose-500/50" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

                {thread.analysis?.forensic && (
                  <div className="p-6 bg-violet-500/5 border-2 border-violet-500/10 rounded-[2rem] space-y-4">
                    <div className="flex items-center gap-3 text-violet-600">
                      <Search className="w-5 h-5" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest">Forensic Findings</h3>
                    </div>
                    <p className="text-sm text-[var(--foreground)] font-semibold">{thread.analysis.forensic.summary || 'No forensic summary available.'}</p>
                    {thread.analysis.forensic.iocs && thread.analysis.forensic.iocs.length > 0 && (
                      <ul className="space-y-2">
                        {thread.analysis.forensic.iocs.map((ioc, i) => (
                          <li key={i} className="text-xs font-mono text-[var(--foreground)] bg-[var(--background)] p-2 rounded-lg border border-[var(--border)]">{ioc}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
