import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, ShieldAlert, Zap } from 'lucide-react';
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
    <div className="p-10 max-w-7xl mx-auto space-y-12 text-[var(--foreground)] transition-colors duration-500">
      <Link 
        to="/" 
        className="inline-flex items-center gap-3 text-[var(--foreground)] hover:text-primary-600 transition-all font-black text-xs uppercase tracking-widest bg-[var(--card)] border border-[var(--border)] px-6 py-3.5 rounded-2xl shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:shadow-black/[0.05] hover:-translate-x-2 group"
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        Return to Matrix
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <header className="space-y-8">
            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tightest bg-clip-text text-transparent bg-gradient-to-br from-[var(--foreground)] to-[var(--foreground)]/60">
              {thread.subject}
            </h1>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="px-5 py-2 bg-primary-500/10 text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-primary-500/20">
                {thread.analysis?.category || 'Unidentified'}
              </span>
              <span className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-colors",
                thread.analysis?.priority === 'High' 
                ? "bg-red-500/10 text-red-600 border-red-500/20" 
                : "bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]"
              )}>
                {thread.analysis?.priority || 'Standard'} Priority
              </span>
            </div>
          </header>

          <div className="space-y-8">
            {emails.map((email, idx) => (
              <motion.div 
                key={email.id}
                initial={{ opacity: 0, scale: 0.98, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 200, damping: 25 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-[3rem] overflow-hidden shadow-2xl shadow-black/[0.02] hover:shadow-black/[0.04] hover:border-primary-500/20 transition-all group"
              >
                <div className="p-8 border-b border-[var(--border)] bg-[var(--secondary)]/20 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-primary-500/20">
                        {email.from.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[var(--card)] rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-extrabold text-[var(--foreground)] truncate tracking-tight">{email.from}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] font-black uppercase tracking-widest opacity-60">
                        {new Date(email.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-10 lg:p-14">
                  <div className="mx-auto max-w-4xl space-y-6">
                    {/<\/?.+>/.test(email.body) ? (
                      <div
                        className="prose prose-slate dark:prose-invert max-w-none text-[var(--foreground)] text-[15px] font-semibold leading-relaxed prose-headings:font-extrabold prose-a:text-primary-500"
                        style={{ wordBreak: 'break-word', fontFamily: 'inherit' }}
                        dangerouslySetInnerHTML={{ __html: email.body }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-[var(--foreground)] text-[15px] font-semibold leading-relaxed tracking-tight">
                        {email.body}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-10">
          <div className="bg-[var(--card)]/50 backdrop-blur-xl border border-[var(--border)] p-12 rounded-[3.5rem] space-y-12 sticky top-10 shadow-2xl shadow-black/[0.03] transition-all duration-500">
            <header className="space-y-3">
              <div className="flex items-center gap-4 text-primary-600 dark:text-primary-400">
                <div className="p-3 bg-primary-600/10 rounded-2xl shadow-inner">
                  <Zap className="w-6 h-6 fill-primary-600 animate-pulse" />
                </div>
                <h2 className="font-black uppercase tracking-[0.25em] text-xs">Intelligence Node</h2>
              </div>
            </header>

            <div className="space-y-12">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <h3 className="text-[11px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.2em] opacity-50">Narrative Synthesis</h3>
                </div>
                <p className="text-[15px] leading-relaxed text-[var(--foreground)] font-bold opacity-90">
                  {thread.analysis?.summary || "Neural buffers are currently synchronizing the conversation context..."}
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <h3 className="text-[11px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.2em] opacity-50">Sentiment Resonance</h3>
                </div>
                <div className="bg-[var(--secondary)]/40 p-6 rounded-[2rem] border border-[var(--border)] flex items-center gap-5 transition-all hover:border-primary-500/30 group">
                  <div className={cn(
                    "w-4 h-4 rounded-full ring-8 ring-offset-4 ring-offset-[var(--card)] transition-all group-hover:scale-125",
                    thread.analysis?.sentiment === 'Positive' ? "bg-emerald-500 ring-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.5)]" :
                    thread.analysis?.sentiment === 'Negative' ? "bg-rose-500 ring-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.5)]" : 
                    "bg-blue-500 ring-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  )} />
                  <span className="text-md font-black text-[var(--foreground)] tracking-tight">{thread.analysis?.sentiment || 'Linear Stability'}</span>
                </div>
              </div>

              {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-10 bg-rose-500/[0.03] border-4 border-rose-500/10 rounded-[3rem] space-y-6 relative overflow-hidden"
                >
                  <div className="absolute -top-4 -right-4 p-4 opacity-5">
                    <ShieldAlert className="w-24 h-24" />
                  </div>
                  <div className="flex items-center gap-4 text-rose-600">
                    <ShieldAlert className="w-6 h-6" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Security Advisory</h3>
                  </div>
                  <ul className="space-y-5 relative z-10">
                    {thread.analysis.threats.map((t, i) => (
                      <li key={i} className="flex items-start gap-4 text-sm text-[var(--foreground)] font-bold leading-relaxed">
                        <div className="mt-2 w-2 h-2 bg-rose-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </motion.div>
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
