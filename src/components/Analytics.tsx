import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, AlertCircle, Shield } from 'lucide-react';
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

  const stats = {
    total: threads.length,
    threats: threads.filter(t => t.analysis?.threats && t.analysis.threats.length > 0).length,
    high: threads.filter(t => t.analysis?.priority === 'High').length,
    categories: {
      work: threads.filter(t => t.analysis?.category === 'Work').length,
      personal: threads.filter(t => t.analysis?.category === 'Personal').length,
      promotions: threads.filter(t => t.analysis?.category === 'Promotions').length,
      spam: threads.filter(t => t.analysis?.category === 'Spam').length,
    },
  };

  const sentiments = {
    positive: threads.filter(t => t.analysis?.sentiment === 'Positive').length,
    neutral: threads.filter(t => t.analysis?.sentiment === 'Neutral').length,
    negative: threads.filter(t => t.analysis?.sentiment === 'Negative').length,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 text-[var(--foreground)] transition-colors duration-300">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-2xl shadow-lg shadow-primary-500/10">
            <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Intelligence Hub</h1>
            <p className="text-[var(--muted-foreground)] font-medium">Detailed behavioral analysis across your conversations</p>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Total Volume</span>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-[var(--foreground)]">{stats.total}</p>
            <p className="text-xs text-[var(--muted-foreground)] font-bold mt-1 uppercase tracking-widest opacity-60">Analyzed threads</p>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider">High Priority</span>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-[var(--foreground)]">{stats.high}</p>
            <p className="text-xs text-[var(--muted-foreground)] font-bold mt-1 uppercase tracking-widest opacity-60">
              {stats.total > 0 ? Math.round((stats.high / stats.total) * 100) : 0}% of inbox
            </p>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Security Risks</span>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-[var(--foreground)]">{stats.threats}</p>
            <p className="text-xs text-[var(--muted-foreground)] font-bold mt-1 uppercase tracking-widest opacity-60">Urgent threats</p>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Neutralized Spam</span>
            <div className="p-2 bg-slate-100 dark:bg-slate-700/40 rounded-lg group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-[var(--foreground)]">{stats.categories.spam}</p>
            <p className="text-xs text-[var(--muted-foreground)] font-bold mt-1 uppercase tracking-widest opacity-60">
              {stats.total > 0 ? Math.round((stats.categories.spam / stats.total) * 100) : 0}% filter rate
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-10 space-y-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Classification Distribution</h2>
          </div>
          <div className="space-y-6">
            {[
              { label: 'Work', value: stats.categories.work, color: 'bg-primary-500 shadow-primary-500/30', bg: 'bg-primary-500/10' },
              { label: 'Personal', value: stats.categories.personal, color: 'bg-emerald-500 shadow-emerald-500/30', bg: 'bg-emerald-500/10' },
              { label: 'Promotions', value: stats.categories.promotions, color: 'bg-purple-500 shadow-purple-500/30', bg: 'bg-purple-500/10' },
              { label: 'Spam', value: stats.categories.spam, color: 'bg-red-500 shadow-red-500/30', bg: 'bg-red-500/10' },
            ].map(cat => (
              <div key={cat.label} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-widest">{cat.label}</span>
                  <span className="text-sm font-black text-[var(--foreground)]">{cat.value}</span>
                </div>
                <div className={`w-full h-3 ${cat.bg} rounded-full overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.total > 0 ? (cat.value / stats.total) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${cat.color} rounded-full shadow-lg`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-10 space-y-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Sentiment Landscape</h2>
          </div>
          <div className="space-y-6">
            {[
              { label: 'Positive Resonance', value: sentiments.positive, color: 'bg-teal-500 shadow-teal-500/30', bg: 'bg-teal-500/10' },
              { label: 'Neutral Baseline', value: sentiments.neutral, color: 'bg-blue-500 shadow-blue-500/30', bg: 'bg-blue-500/10' },
              { label: 'Negative Indicators', value: sentiments.negative, color: 'bg-rose-500 shadow-rose-500/30', bg: 'bg-rose-500/10' },
            ].map(sent => (
              <div key={sent.label} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-widest">{sent.label}</span>
                  <span className="text-sm font-black text-[var(--foreground)]">{sent.value}</span>
                </div>
                <div className={`w-full h-3 ${sent.bg} rounded-full overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.total > 0 ? (sent.value / stats.total) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${sent.color} rounded-full shadow-lg`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threats Breakdown */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-10 space-y-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-black tracking-tight">Security Threat Analysis</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threat Summary */}
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-200 dark:bg-red-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">Detected Threats</span>
              </div>
              <p className="text-4xl font-black text-red-600 dark:text-red-400">{stats.threats}</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 font-medium">
                {stats.total > 0 ? Math.round((stats.threats / stats.total) * 100) : 0}% of conversations contain threats
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-200 dark:bg-orange-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider">High Priority</span>
              </div>
              <p className="text-4xl font-black text-orange-600 dark:text-orange-400">{stats.high}</p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">
                Requires immediate attention
              </p>
            </div>
          </div>

          {/* Risk Categories */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-widest px-1">Threat Types Detected</h3>
            <div className="space-y-2">
              {[
                { name: 'Phishing Attempts', count: threads.reduce((sum, t) => sum + (t.analysis?.threats?.filter(th => th.toLowerCase().includes('verify') || th.toLowerCase().includes('confirm')).length || 0), 0), color: 'text-red-600 dark:text-red-400' },
                { name: 'Malware/Links', count: threads.reduce((sum, t) => sum + (t.analysis?.threats?.filter(th => th.toLowerCase().includes('link') || th.toLowerCase().includes('click')).length || 0), 0), color: 'text-orange-600 dark:text-orange-400' },
                { name: 'Social Engineering', count: threads.reduce((sum, t) => sum + (t.analysis?.threats?.filter(th => th.toLowerCase().includes('urgent') || th.toLowerCase().includes('action')).length || 0), 0), color: 'text-amber-600 dark:text-amber-400' },
                { name: 'Domain Spoofing', count: threads.reduce((sum, t) => sum + (t.analysis?.threats?.filter(th => th.toLowerCase().includes('domain') || th.toLowerCase().includes('mismatch')).length || 0), 0), color: 'text-yellow-600 dark:text-yellow-400' },
              ].map(threat => (
                <div key={threat.name} className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg border border-[var(--border)]">
                  <span className="text-sm font-medium text-[var(--foreground)]">{threat.name}</span>
                  <span className={`font-bold text-lg ${threat.color}`}>{threat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {stats.total === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--card)] border-2 border-dashed border-[var(--border)] rounded-[3rem] p-24 text-center space-y-6"
        >
          <div className="p-6 bg-[var(--secondary)] rounded-full w-24 h-24 flex items-center justify-center mx-auto text-[var(--muted-foreground)]">
            <BarChart3 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-black text-[var(--foreground)]">Insufficient analysis data</p>
            <p className="text-[var(--muted-foreground)] max-w-sm mx-auto font-medium">Sync your Gmail account from the dashboard to begin generating conversation intelligence.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
