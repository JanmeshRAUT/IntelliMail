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

  if (loading) return <div className="p-8 animate-pulse space-y-4"><div className="h-8 w-1/3 bg-neutral-200 rounded" /><div className="h-64 bg-neutral-100 rounded-2xl" /></div>;
  if (!thread) return <div className="p-8">Thread not found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-neutral-900 leading-tight">{thread.subject}</h1>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {thread.analysis?.category}
              </span>
              <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {thread.analysis?.priority} Priority
              </span>
            </div>
          </header>

          <div className="space-y-4">
            {emails.map((email, idx) => (
              <motion.div 
                key={email.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="p-4 border-bottom bg-neutral-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{email.from}</p>
                      <p className="text-xs text-neutral-500">{new Date(email.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="prose prose-neutral max-w-none text-neutral-800 whitespace-pre-wrap text-sm leading-relaxed">
                    {email.body}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-neutral-900 text-white p-6 rounded-3xl space-y-6 sticky top-8">
            <div className="flex items-center gap-2 text-blue-400">
              <Zap className="w-5 h-5" />
              <h2 className="font-bold uppercase tracking-widest text-xs">AI Insights</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Summary</h3>
                <p className="text-sm leading-relaxed text-neutral-200">
                  {thread.analysis?.summary}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Sentiment</h3>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    thread.analysis?.sentiment === 'Positive' ? "bg-emerald-400" :
                    thread.analysis?.sentiment === 'Negative' ? "bg-rose-400" : "bg-neutral-400"
                  )} />
                  <span className="text-sm font-medium">{thread.analysis?.sentiment}</span>
                </div>
              </div>

              {thread.analysis?.threats && thread.analysis.threats.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Threats Detected</h3>
                  </div>
                  <ul className="text-xs space-y-1 text-red-200">
                    {thread.analysis.threats.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 w-1 h-1 bg-red-400 rounded-full shrink-0" />
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
