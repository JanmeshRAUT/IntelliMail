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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 text-[var(--foreground)] transition-colors duration-500">
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-[var(--foreground)] hover:text-primary-600 transition-all font-bold text-[10px] uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] px-4 py-2 rounded-xl"
      >
        <ArrowLeft className="w-4 h-4" />
        Return
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <header className="space-y-4">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-[var(--foreground)] to-[var(--foreground)]/60">
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

          <div className="space-y-6">
            {emails.map((email, idx) => (
              <motion.div 
                key={email.id}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:border-primary-500/20 transition-all group"
              >
                <div className="p-4 border-b border-[var(--border)] bg-[var(--secondary)]/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg">
                        {email.from.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--foreground)] truncate tracking-tight">{email.from}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] font-semibold opacity-60">
                        {new Date(email.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 md:p-6 lg:p-8">
                  <div className="mx-auto max-w-4xl space-y-4">
                    {/<\/?.+>/.test(email.body) ? (
                      <div
                        className="prose prose-slate dark:prose-invert max-w-none text-[var(--foreground)] text-[13px] font-semibold leading-relaxed"
                        style={{ wordBreak: 'break-word', fontFamily: 'inherit' }}
                        dangerouslySetInnerHTML={{ __html: email.body }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-[var(--foreground)] text-[13px] font-semibold leading-relaxed tracking-tight">
                        {email.body}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--card)]/50 backdrop-blur-md border border-[var(--border)] p-6 rounded-2xl space-y-6 sticky top-6 shadow-sm">
            <header className="space-y-2">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <Zap className="w-4 h-4 fill-primary-600" />
                <h2 className="font-bold uppercase tracking-wider text-[10px]">Intelligence</h2>
              </div>
            </header>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest opacity-50">Summary</h3>
                <p className="text-xs leading-relaxed text-[var(--foreground)] font-bold">
                  {thread.analysis?.summary || "Neural buffers synchronizing..."}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest opacity-50">Sentiment</h3>
                <div className="bg-[var(--secondary)]/40 p-4 rounded-xl border border-[var(--border)] flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full ring-4 ring-offset-2 ring-offset-[var(--card)]",
                    thread.analysis?.sentiment === 'Positive' ? "bg-emerald-500 ring-emerald-500/10" :
                    thread.analysis?.sentiment === 'Negative' ? "bg-rose-500 ring-rose-500/10" : 
                    "bg-blue-500 ring-blue-500/10"
                  )} />
                  <span className="text-sm font-bold text-[var(--foreground)] tracking-tight">{thread.analysis?.sentiment || 'Neutral'}</span>
                </div>
              </div>

              {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                <div className="p-6 bg-rose-500/[0.03] border-2 border-rose-500/10 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center gap-3 text-rose-600">
                    <ShieldAlert className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-wider">Threats</h3>
                  </div>
                  <ul className="space-y-3 relative z-10 text-[11px] text-[var(--foreground)] font-bold leading-relaxed">
                    {thread.analysis.threats.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
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
