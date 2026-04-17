import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Layers3,
  Mail,
  Shield,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Email, Thread, getEmails, getThreads } from '../lib/localData';

type MetricCard = {
  label: string;
  value: string;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

const CATEGORY_ORDER = ['Work', 'Personal', 'Promotions', 'Spam'] as const;
const SENTIMENT_ORDER = ['Positive', 'Neutral', 'Negative'] as const;

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getDisplayName(address: string) {
  return address.split('@')[0]?.replace(/[._-]+/g, ' ') || address;
}

function getDomain(address: string) {
  return (address.split('@')[1] || '').replace(/^www\./, '').toLowerCase();
}

function getRiskLevel(priority?: string) {
  const normalized = (priority || '').toLowerCase();
  if (normalized.includes('high')) return 'High';
  if (normalized.includes('medium')) return 'Medium';
  return 'Low';
}

function buildChartPath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) {
    return '';
  }

  const maxValue = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + step * index;
      const y = padding + innerHeight - (value / maxValue) * innerHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildChartAreaPath(values: number[], width: number, height: number, padding: number) {
  const linePath = buildChartPath(values, width, height, padding);
  if (!linePath) {
    return '';
  }

  const innerHeight = height - padding * 2;
  const innerWidth = width - padding * 2;
  const maxValue = Math.max(...values, 1);
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;
  const firstX = padding;
  const firstY = padding + innerHeight - (values[0] / maxValue) * innerHeight;
  const lastX = padding + step * (values.length - 1);

  return `${linePath} L ${lastX.toFixed(2)} ${height - padding} L ${firstX.toFixed(2)} ${height - padding} Z`;
}

export default function Analytics() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);

  useEffect(() => {
    const hydrate = () => {
      setThreads(getThreads());
      setEmails(getEmails());
    };

    hydrate();
    window.addEventListener('intellimail:data-updated', hydrate);
    return () => window.removeEventListener('intellimail:data-updated', hydrate);
  }, []);

  const analytics = useMemo(() => {
    const threadedEmails = emails.filter((email) => Boolean(email.threadId));
    const analyzedThreads = threads.filter((thread) => thread.analysis);
    const securityThreads = analyzedThreads.filter((thread) => thread.analysis?.threats?.length);
    const highPriorityThreads = analyzedThreads.filter((thread) => getRiskLevel(thread.analysis?.priority) === 'High');
    const spamThreads = analyzedThreads.filter((thread) => thread.analysis?.category === 'Spam');
    const promotionalThreads = analyzedThreads.filter((thread) => thread.analysis?.category === 'Promotions');

    const categoryCounts = CATEGORY_ORDER.map((label) => ({
      label,
      value: analyzedThreads.filter((thread) => thread.analysis?.category === label).length,
    }));

    const sentimentCounts = SENTIMENT_ORDER.map((label) => ({
      label,
      value: analyzedThreads.filter((thread) => thread.analysis?.sentiment === label).length,
    }));

    const topThreads = [...analyzedThreads]
      .sort((a, b) => {
        const aScore = a.analysis?.priority === 'High' ? 3 : a.analysis?.priority === 'Medium' ? 2 : 1;
        const bScore = b.analysis?.priority === 'High' ? 3 : b.analysis?.priority === 'Medium' ? 2 : 1;
        const aThreats = a.analysis?.threats?.length || 0;
        const bThreats = b.analysis?.threats?.length || 0;
        return bScore - aScore || bThreats - aThreats;
      })
      .slice(0, 5);

    const senderMap = threadedEmails.reduce<Record<string, { count: number; latest: string }>>((accumulator, email) => {
      const current = accumulator[email.from];
      accumulator[email.from] = {
        count: (current?.count || 0) + 1,
        latest: !current || new Date(email.timestamp).getTime() > new Date(current.latest).getTime() ? email.timestamp : current.latest,
      };
      return accumulator;
    }, {});

    const senderRows = Object.entries(senderMap)
      .map(([sender, summary]) => ({ sender, ...summary }))
      .sort((a, b) => b.count - a.count || new Date(b.latest).getTime() - new Date(a.latest).getTime())
      .slice(0, 5);

    const dailyActivity = threadedEmails.reduce<Record<string, number>>((accumulator, email) => {
      const day = new Date(email.timestamp).toISOString().slice(0, 10);
      accumulator[day] = (accumulator[day] || 0) + 1;
      return accumulator;
    }, {});

    const timeline = Object.entries(dailyActivity)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-7);

    const latestEmail = [...threadedEmails].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const earliestEmail = [...threadedEmails].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

    const threatRate = analyzedThreads.length > 0 ? Math.round((securityThreads.length / analyzedThreads.length) * 100) : 0;
    const highPriorityRate = analyzedThreads.length > 0 ? Math.round((highPriorityThreads.length / analyzedThreads.length) * 100) : 0;
    const spamRate = analyzedThreads.length > 0 ? Math.round((spamThreads.length / analyzedThreads.length) * 100) : 0;
    const inboxHealth = Math.max(0, 100 - threatRate - Math.round(highPriorityRate / 2));

    return {
      analyzedThreads,
      threadedEmails,
      securityThreads,
      highPriorityThreads,
      spamThreads,
      promotionalThreads,
      categoryCounts,
      sentimentCounts,
      topThreads,
      senderRows,
      timeline,
      threatRate,
      highPriorityRate,
      spamRate,
      inboxHealth,
      latestEmail,
      earliestEmail,
    };
  }, [emails, threads]);

  const reportCards: MetricCard[] = [
    {
      label: 'Threads analyzed',
      value: String(analytics.analyzedThreads.length),
      icon: Layers3,
      tone: 'from-slate-500 to-slate-700',
      note: `${analytics.threadedEmails.length} emails in scope`,
    },
    {
      label: 'Security flags',
      value: String(analytics.securityThreads.length),
      icon: Shield,
      tone: 'from-red-500 to-rose-600',
      note: `${formatPercent(analytics.threatRate)} of analyzed threads`,
    },
    {
      label: 'High priority',
      value: String(analytics.highPriorityThreads.length),
      icon: TriangleAlert,
      tone: 'from-amber-500 to-orange-600',
      note: `${formatPercent(analytics.highPriorityRate)} escalated`,
    },
    {
      label: 'Inbox health',
      value: `${analytics.inboxHealth}/100`,
      icon: Activity,
      tone: 'from-emerald-500 to-teal-600',
      note: 'Blended from risk and priority signals',
    },
  ];

  const categoryTotal = Math.max(1, analytics.categoryCounts.reduce((sum, item) => sum + item.value, 0));
  const sentimentTotal = Math.max(1, analytics.sentimentCounts.reduce((sum, item) => sum + item.value, 0));
  const activityPeak = Math.max(1, ...analytics.timeline.map((entry) => entry.count));
  const activityValues = analytics.timeline.map((entry) => entry.count);
  const chartWidth = 720;
  const chartHeight = 260;
  const chartPadding = 28;
  const chartLinePath = buildChartPath(activityValues, chartWidth, chartHeight, chartPadding);
  const chartAreaPath = buildChartAreaPath(activityValues, chartWidth, chartHeight, chartPadding);
  const hasData = analytics.analyzedThreads.length > 0 || analytics.threadedEmails.length > 0;
  const startDate = analytics.earliestEmail ? formatDate(analytics.earliestEmail.timestamp) : 'No data yet';
  const endDate = analytics.latestEmail ? formatDate(analytics.latestEmail.timestamp) : 'No data yet';

  return (
    <div className="min-h-full bg-[var(--background)] px-4 py-4 text-[var(--foreground)] transition-colors duration-300 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,140,233,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_28%),linear-gradient(135deg,rgba(2,109,198,0.04),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300">
                <Sparkles className="h-3.5 w-3.5" />
                Executive analytics dashboard
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary-100 p-3 dark:bg-primary-500/15">
                  <BarChart3 className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight md:text-4xl">Inbox performance, risk, and activity</h1>
                  <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)] md:text-base">
                    Real mailbox data from synced Gmail threads, scored security signals, and conversation trends rendered in one decision-ready view.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted-foreground)]">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 shadow-sm">
                  <CalendarDays className="h-3.5 w-3.5 text-primary-600" />
                  {startDate} to {endDate}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 shadow-sm">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  {analytics.senderRows.length} active senders tracked
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 shadow-sm">
                  <Activity className="h-3.5 w-3.5 text-amber-600" />
                  {hasData ? 'Live inbox trends' : 'Waiting for synced Gmail data'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 rounded-[1.75rem] border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm sm:grid-cols-2 lg:w-[28rem] lg:grid-cols-1">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--card)] p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Real data source</p>
                  <p className="mt-1 text-sm font-bold">Synced Gmail + local analysis</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-primary-600" />
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted-foreground)]">
                  <span>Inbox health</span>
                  <span>{analytics.inboxHealth}/100</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--secondary)]">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary-500 to-cyan-500" style={{ width: `${analytics.inboxHealth}%` }} />
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.tone}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{card.label}</p>
                    <p className="text-3xl font-black tracking-tight">{card.value}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{card.note}</p>
                  </div>
                  <div className={`rounded-2xl bg-gradient-to-br ${card.tone} p-3 text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">Classification mix</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Thread labels derived from the latest synced mailbox analysis.</p>
              </div>
              <Layers3 className="h-5 w-5 text-primary-600" />
            </div>

            <div className="mt-5 space-y-4">
              {analytics.categoryCounts.map((category, index) => {
                const barColors = ['bg-primary-500', 'bg-emerald-500', 'bg-violet-500', 'bg-red-500'];
                const bgColors = ['bg-primary-500/10', 'bg-emerald-500/10', 'bg-violet-500/10', 'bg-red-500/10'];
                const width = `${(category.value / categoryTotal) * 100}%`;

                return (
                  <div key={category.label} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{category.label}</span>
                      <span className="text-sm font-black">{category.value}</span>
                    </div>
                    <div className={`h-2.5 overflow-hidden rounded-full ${bgColors[index]}`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barColors[index]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">Sentiment split</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Measured against the current dataset in local storage.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary-600" />
            </div>

            <div className="mt-5 space-y-4">
              {analytics.sentimentCounts.map((sentiment) => {
                const palette: Record<string, { bar: string; bg: string }> = {
                  Positive: { bar: 'bg-emerald-500', bg: 'bg-emerald-500/10' },
                  Neutral: { bar: 'bg-blue-500', bg: 'bg-blue-500/10' },
                  Negative: { bar: 'bg-rose-500', bg: 'bg-rose-500/10' },
                };
                const width = `${(sentiment.value / sentimentTotal) * 100}%`;

                return (
                  <div key={sentiment.label} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{sentiment.label}</span>
                      <span className="text-sm font-black">{sentiment.value}</span>
                    </div>
                    <div className={`h-2.5 overflow-hidden rounded-full ${palette[sentiment.label].bg}`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className={`h-full rounded-full ${palette[sentiment.label].bar}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">Top findings</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Threads with the strongest mix of priority and threat signals.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary-600" />
            </div>

            <div className="mt-5 space-y-4">
              {analytics.topThreads.length > 0 ? (
                analytics.topThreads.map((thread, index) => (
                  <div key={thread.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary-700">#{index + 1}</span>
                          <span className="truncate text-base font-bold">{thread.subject}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                          {thread.analysis?.summary || 'No summary available for this thread.'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                          getRiskLevel(thread.analysis?.priority) === 'High'
                            ? 'bg-red-100 text-red-700'
                            : getRiskLevel(thread.analysis?.priority) === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {thread.analysis?.priority || 'Low'} priority
                        </span>
                        {!!thread.analysis?.threats?.length && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-red-700">
                            {thread.analysis.threats.length} threat{thread.analysis.threats.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-10 text-center text-[var(--muted-foreground)]">
                  Sync Gmail to populate executive insights with real threads and security signals.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Activity trend</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Daily email volume from synced Gmail data.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] shadow-sm">
                  <Clock3 className="h-4 w-4 text-primary-600" />
                  Peak {activityPeak}/day
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
                {analytics.timeline.length > 0 ? (
                  <div className="space-y-4">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-64 w-full overflow-visible">
                      <defs>
                        <linearGradient id="activityGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="rgb(14, 140, 233)" stopOpacity="0.36" />
                          <stop offset="100%" stopColor="rgb(14, 140, 233)" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="activityStroke" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="rgb(14, 140, 233)" />
                          <stop offset="100%" stopColor="rgb(16, 185, 129)" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75].map((ratio) => {
                        const y = chartPadding + (chartHeight - chartPadding * 2) * ratio;
                        return <line key={ratio} x1={chartPadding} x2={chartWidth - chartPadding} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 8" />;
                      })}
                      {chartAreaPath ? <path d={chartAreaPath} fill="url(#activityGradient)" /> : null}
                      {chartLinePath ? <path d={chartLinePath} fill="none" stroke="url(#activityStroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
                      {activityValues.map((value, index) => {
                        const maxValue = Math.max(...activityValues, 1);
                        const innerWidth = chartWidth - chartPadding * 2;
                        const innerHeight = chartHeight - chartPadding * 2;
                        const step = activityValues.length > 1 ? innerWidth / (activityValues.length - 1) : 0;
                        const x = chartPadding + step * index;
                        const y = chartPadding + innerHeight - (value / maxValue) * innerHeight;

                        return (
                          <g key={`${analytics.timeline[index]?.day || index}-${value}`}>
                            <circle cx={x} cy={y} r="5" fill="rgb(255,255,255)" stroke="rgb(14,140,233)" strokeWidth="3" />
                          </g>
                        );
                      })}
                    </svg>

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      {analytics.timeline.map((entry) => (
                        <div key={entry.day} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{formatDate(entry.day)}</p>
                          <p className="mt-1 text-sm font-bold">{entry.count} email{entry.count > 1 ? 's' : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-sm text-[var(--muted-foreground)]">
                    No synced email timestamps yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Top senders</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Who is driving the most inbox activity.</p>
                </div>
                <Mail className="h-5 w-5 text-primary-600" />
              </div>

              <div className="mt-5 space-y-3">
                {analytics.senderRows.length > 0 ? (
                  analytics.senderRows.map((sender) => (
                    <div key={sender.sender} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{getDisplayName(sender.sender)}</p>
                          <p className="truncate text-xs text-[var(--muted-foreground)]">{getDomain(sender.sender)}</p>
                        </div>
                        <span className="rounded-full bg-primary-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary-700">
                          {sender.count} mail{sender.count > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">Latest message {formatDateTime(sender.latest)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-sm text-[var(--muted-foreground)]">
                    Sync Gmail to see sender concentration and volume leaders.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">Risk snapshot</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Live scores derived from the current sync session.</p>
              </div>
              <Shield className="h-5 w-5 text-primary-600" />
            </div>

            <div className="mt-5 space-y-4">
              {[
                { label: 'Security risk rate', value: analytics.threatRate, text: `${analytics.securityThreads.length}/${analytics.analyzedThreads.length || 1} flagged threads`, color: 'bg-red-500' },
                { label: 'High priority rate', value: analytics.highPriorityRate, text: `${analytics.highPriorityThreads.length} escalations`, color: 'bg-amber-500' },
                { label: 'Spam rate', value: analytics.spamRate, text: `${analytics.spamThreads.length} spam threads`, color: 'bg-violet-500' },
                { label: 'Promotional traffic', value: analytics.promotionalThreads.length, text: 'Marketing and newsletter traffic', color: 'bg-sky-500', percent: false },
              ].map((metric) => {
                const width = metric.percent === false ? Math.min(100, metric.value * 12) : metric.value;
                return (
                  <div key={metric.label} className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{metric.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{metric.text}</p>
                      </div>
                      <p className="text-2xl font-black">{metric.percent === false ? metric.value : `${metric.value}%`}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--secondary)]">
                      <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">Data coverage</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Where this report is pulling from right now.</p>
              </div>
              <Activity className="h-5 w-5 text-primary-600" />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Thread records</p>
                <p className="mt-2 text-2xl font-black">{analytics.analyzedThreads.length}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Thread-level analysis entries stored locally.</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Email records</p>
                <p className="mt-2 text-2xl font-black">{analytics.threadedEmails.length}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Raw emails synced from Gmail into the session cache.</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Latest update</p>
                <p className="mt-2 text-sm font-bold">{analytics.latestEmail ? formatDateTime(analytics.latestEmail.timestamp) : 'No synced messages yet'}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  This dashboard updates automatically when Gmail sync writes new local data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {!hasData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[2rem] border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center space-y-6 shadow-sm md:p-20"
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--muted-foreground)] shadow-inner">
              <BarChart3 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-[var(--foreground)]">No analytics data yet</p>
              <p className="mx-auto max-w-lg font-medium text-[var(--muted-foreground)]">
                Sync Gmail from the dashboard to populate this report with real security, sentiment, sender, and classification metrics.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}