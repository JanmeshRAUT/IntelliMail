import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Shield } from 'lucide-react';
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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Email Analytics</h1>
        </div>
        <p className="text-neutral-500">Insights and statistics from your email threads</p>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">Total Threads</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{stats.total}</p>
          <p className="text-xs text-neutral-400">Synced from Gmail</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">High Priority</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{stats.high}</p>
          <p className="text-xs text-neutral-400">{stats.total > 0 ? Math.round((stats.high / stats.total) * 100) : 0}% of total</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">Threats Detected</span>
            <Shield className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{stats.threats}</p>
          <p className="text-xs text-neutral-400">Security alerts</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">Spam Emails</span>
            <AlertTriangle className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{stats.categories.spam}</p>
          <p className="text-xs text-neutral-400">{stats.total > 0 ? Math.round((stats.categories.spam / stats.total) * 100) : 0}% of total</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Email Categories</h2>
          <div className="space-y-3">
            {[
              { label: 'Work', value: stats.categories.work, color: 'bg-blue-100 text-blue-700' },
              { label: 'Personal', value: stats.categories.personal, color: 'bg-green-100 text-green-700' },
              { label: 'Promotions', value: stats.categories.promotions, color: 'bg-purple-100 text-purple-700' },
              { label: 'Spam', value: stats.categories.spam, color: 'bg-red-100 text-red-700' },
            ].map(cat => (
              <div key={cat.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-600">{cat.label}</span>
                  <span className="text-sm font-bold text-neutral-900">{cat.value}</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color}`}
                    style={{ width: `${stats.total > 0 ? (cat.value / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Sentiment Analysis</h2>
          <div className="space-y-3">
            {[
              { label: 'Positive', value: sentiments.positive, color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Neutral', value: sentiments.neutral, color: 'bg-neutral-100 text-neutral-700' },
              { label: 'Negative', value: sentiments.negative, color: 'bg-rose-100 text-rose-700' },
            ].map(sent => (
              <div key={sent.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-600">{sent.label}</span>
                  <span className="text-sm font-bold text-neutral-900">{sent.value}</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${sent.color}`}
                    style={{ width: `${stats.total > 0 ? (sent.value / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {stats.total === 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-12 text-center space-y-2">
          <BarChart3 className="w-8 h-8 text-neutral-300 mx-auto" />
          <p className="text-neutral-500 font-medium">No data available yet</p>
          <p className="text-sm text-neutral-400">Sync your Gmail inbox from the Dashboard to see analytics</p>
        </div>
      )}
    </div>
  );
}
