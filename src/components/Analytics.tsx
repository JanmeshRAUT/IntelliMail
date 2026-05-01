import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Shield, Activity, Sparkles, Layers3, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { Thread, getThreads } from '../lib/localData';

export default function Analytics() {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    const hydrate = () => {
      setThreads(getThreads());
    };

    hydrate();
    window.addEventListener('intellimail:data-updated', hydrate);
    return () => window.removeEventListener('intellimail:data-updated', hydrate);
  }, []);

  const securityThreads = threads.filter((thread) => thread.analysis?.threats && thread.analysis.threats.length > 0);
  const highPriorityThreads = threads.filter((thread) => thread.analysis?.priority === 'High');
  const spamThreads = threads.filter((thread) => thread.analysis?.category === 'Spam');
  const promotionalThreads = threads.filter((thread) => thread.analysis?.category === 'Promotions');
  const workThreads = threads.filter((thread) => thread.analysis?.category === 'Work');
  const personalThreads = threads.filter((thread) => thread.analysis?.category === 'Personal');

  const sentimentCounts = {
    positive: threads.filter((thread) => thread.analysis?.sentiment === 'Positive').length,
    neutral: threads.filter((thread) => thread.analysis?.sentiment === 'Neutral').length,
    negative: threads.filter((thread) => thread.analysis?.sentiment === 'Negative').length,
  };

  const threatRate = threads.length > 0 ? Math.round((securityThreads.length / threads.length) * 100) : 0;
  const highPriorityRate = threads.length > 0 ? Math.round((highPriorityThreads.length / threads.length) * 100) : 0;
  const spamRate = threads.length > 0 ? Math.round((spamThreads.length / threads.length) * 100) : 0;

  const reportCards = [
    {
      label: 'Total Threads',
      value: threads.length,
      icon: Layers3,
      accent: 'from-slate-500 to-slate-700',
      note: 'Conversations reviewed',
    },
    {
      label: 'Security Flags',
      value: securityThreads.length,
      icon: Shield,
      accent: 'from-red-500 to-rose-600',
      note: `${threatRate}% of inbox`,
    },
    {
      label: 'High Priority',
      value: highPriorityThreads.length,
      icon: AlertTriangle,
      accent: 'from-amber-500 to-orange-600',
      note: `${highPriorityRate}% escalated`,
    },
    {
      label: 'Spam / Promotions',
      value: spamThreads.length + promotionalThreads.length,
      icon: Mail,
      accent: 'from-indigo-500 to-violet-600',
      note: `${spamRate}% filtered`,
    },
  ];

  const topThreads = [...threads]
    .filter((thread) => thread.analysis)
    .sort((a, b) => {
      const aScore = a.analysis?.priority === 'High' ? 3 : a.analysis?.priority === 'Medium' ? 2 : 1;
      const bScore = b.analysis?.priority === 'High' ? 3 : b.analysis?.priority === 'Medium' ? 2 : 1;
      return bScore - aScore;
    })
    .slice(0, 5);

  return (
    <div className="min-h-full bg-[var(--background)] p-8 text-[var(--foreground)] transition-colors duration-300">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/8 via-transparent to-emerald-500/8" />
          <div className="relative p-8 md:p-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300">
                <Sparkles className="w-3.5 h-3.5" />
                Intelligence Report
              </div>
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-primary-100 p-3 dark:bg-primary-900/30">
                  <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight">Analytics Overview</h1>
                  <p className="text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
                    Professional summary of inbox security posture, message classifications, and sentiment patterns.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-[var(--muted-foreground)]">
                <Activity className="w-4 h-4 text-primary-600" />
                {threads.length > 0 ? 'Live inbox trends updated from sync data' : 'No inbox data yet'}
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {reportCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{card.label}</p>
                    <p className="mt-3 text-3xl font-black text-[var(--foreground)]">{card.value}</p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">{card.note}</p>
                  </div>
                  <div className={`rounded-2xl bg-gradient-to-br ${card.accent} p-3 text-white shadow-lg`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Classification Distribution</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Thread mix across core conversation categories</p>
            </div>

            <div className="space-y-5">
              {[
                { label: 'Work', value: workThreads.length, color: 'bg-primary-500 shadow-primary-500/30', bg: 'bg-primary-500/10' },
                { label: 'Personal', value: personalThreads.length, color: 'bg-emerald-500 shadow-emerald-500/30', bg: 'bg-emerald-500/10' },
                { label: 'Promotions', value: promotionalThreads.length, color: 'bg-purple-500 shadow-purple-500/30', bg: 'bg-purple-500/10' },
                { label: 'Spam', value: spamThreads.length, color: 'bg-red-500 shadow-red-500/30', bg: 'bg-red-500/10' },
              ].map((category) => (
                <div key={category.label} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{category.label}</span>
                    <span className="text-sm font-black text-[var(--foreground)]">{category.value}</span>
                  </div>
                  <div className={`h-3 w-full overflow-hidden rounded-full ${category.bg}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${threads.length > 0 ? (category.value / threads.length) * 100 : 0}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${category.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Sentiment Landscape</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Conversation tone across the current inbox</p>
            </div>

            <div className="space-y-5">
              {[
                { label: 'Positive Resonance', value: sentimentCounts.positive, color: 'bg-teal-500 shadow-teal-500/30', bg: 'bg-teal-500/10' },
                { label: 'Neutral Baseline', value: sentimentCounts.neutral, color: 'bg-blue-500 shadow-blue-500/30', bg: 'bg-blue-500/10' },
                { label: 'Negative Indicators', value: sentimentCounts.negative, color: 'bg-rose-500 shadow-rose-500/30', bg: 'bg-rose-500/10' },
              ].map((sentiment) => (
                <div key={sentiment.label} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{sentiment.label}</span>
                    <span className="text-sm font-black text-[var(--foreground)]">{sentiment.value}</span>
                  </div>
                  <div className={`h-3 w-full overflow-hidden rounded-full ${sentiment.bg}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${threads.length > 0 ? (sentiment.value / threads.length) * 100 : 0}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${sentiment.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Top Findings</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Most important threads by priority and security state</p>
              </div>
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>

            {topThreads.length > 0 ? (
              <div className="space-y-4">
                {topThreads.map((thread, index) => (
                  <div key={thread.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-700">
                            #{index + 1}
                          </span>
                          <span className="truncate text-lg font-bold text-[var(--foreground)]">{thread.subject}</span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {thread.analysis?.summary || 'No summary available'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          thread.analysis?.priority === 'High'
                            ? 'bg-red-100 text-red-800'
                            : thread.analysis?.priority === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {thread.analysis?.priority || 'Low'} Priority
                        </span>
                        {thread.analysis?.threats?.length ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-800">
                            {thread.analysis.threats.length} threat{thread.analysis.threats.length > 1 ? 's' : ''}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-10 text-center text-[var(--muted-foreground)]">
                Sync your mailbox to populate the report.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Operational Snapshot</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Quick indicators for day-to-day monitoring</p>
              </div>
              <Activity className="w-5 h-5 text-primary-600" />
            </div>

            <div className="space-y-4">
              {[
                { label: 'Security risk rate', value: threatRate, text: `${securityThreads.length}/${threads.length || 1} threads`, color: 'bg-red-500' },
                { label: 'High priority rate', value: highPriorityRate, text: `${highPriorityThreads.length} escalations`, color: 'bg-amber-500' },
                { label: 'Spam rate', value: spamRate, text: `${spamThreads.length} filtered threads`, color: 'bg-purple-500' },
              ].map((metric) => (
                <div key={metric.label} className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{metric.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{metric.text}</p>
                    </div>
                    <p className="text-2xl font-black text-[var(--foreground)]">{metric.value}%</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--secondary)]">
                    <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {threads.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[2rem] border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-20 text-center space-y-6 shadow-sm"
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--muted-foreground)]">
              <BarChart3 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-[var(--foreground)]">No analytics data yet</p>
              <p className="text-[var(--muted-foreground)] max-w-lg mx-auto font-medium">
                Sync Gmail from the dashboard to populate this report with security, sentiment, and classification metrics.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
