import React, { useState, useEffect } from 'react';
import { RiskBadge } from './RiskBadge';
import type { Thread, ThreadSecuritySummary } from '../lib/types';

interface ThreadListProps {
  threads: Thread[];
  analyses: Map<string, ThreadSecuritySummary>;
  onSelectThread: (threadId: string) => void;
  selectedThreadId?: string;
  loading?: boolean;
}

/**
 * Thread List Panel - Shows all threads with risk levels
 */
export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  analyses,
  onSelectThread,
  selectedThreadId,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  const filteredThreads = threads.filter((thread) => {
    const analysis = analyses.get(thread.threadId);
    if (!analysis) return true;

    // Filter by risk level
    if (filterRisk !== 'All' && analysis.overallRiskLevel !== filterRisk) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        thread.threadId.toLowerCase().includes(searchLower) ||
        thread.participants.some((p) => p.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Count statistics
  const stats = {
    total: threads.length,
    high: threads.filter((t) => analyses.get(t.threadId)?.overallRiskLevel === 'High').length,
    medium: threads.filter((t) => analyses.get(t.threadId)?.overallRiskLevel === 'Medium').length,
    low: threads.filter((t) => analyses.get(t.threadId)?.overallRiskLevel === 'Low').length,
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Email Threads</h2>

        {/* Statistics */}
        <div className="mb-4 grid grid-cols-4 gap-2 text-center">
          <div className="rounded bg-gray-100 p-2">
            <p className="text-xs text-gray-600">Total</p>
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded bg-red-100 p-2">
            <p className="text-xs text-red-700">High</p>
            <p className="text-lg font-bold text-red-900">{stats.high}</p>
          </div>
          <div className="rounded bg-yellow-100 p-2">
            <p className="text-xs text-yellow-700">Medium</p>
            <p className="text-lg font-bold text-yellow-900">{stats.medium}</p>
          </div>
          <div className="rounded bg-green-100 p-2">
            <p className="text-xs text-green-700">Low</p>
            <p className="text-lg font-bold text-green-900">{stats.low}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search threads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <div className="flex gap-2 overflow-x-auto">
            {(['All', 'High', 'Medium', 'Low'] as const).map((risk) => (
              <button
                key={risk}
                onClick={() => setFilterRisk(risk)}
                className={`whitespace-nowrap rounded px-3 py-1 text-xs font-semibold transition-colors ${
                  filterRisk === risk
                    ? risk === 'High'
                      ? 'bg-red-500 text-white'
                      : risk === 'Medium'
                        ? 'bg-yellow-500 text-white'
                        : risk === 'Low'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-gray-500">Loading threads...</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-gray-500">No threads found</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {filteredThreads.map((thread) => {
              const analysis = analyses.get(thread.threadId);
              const isSelected = selectedThreadId === thread.threadId;

              return (
                <button
                  key={thread.threadId}
                  onClick={() => onSelectThread(thread.threadId)}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Thread ID */}
                      <p className="truncate font-mono text-xs text-gray-600">
                        {thread.threadId}
                      </p>

                      {/* Participants */}
                      <p className="truncate text-sm text-gray-700 mt-1">
                        {thread.participants.slice(0, 2).join(', ')}
                        {thread.participants.length > 2 && ` +${thread.participants.length - 2}`}
                      </p>

                      {/* Email count */}
                      <p className="text-xs text-gray-500 mt-1">
                        {thread.emails.length} email{thread.emails.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Risk Badge */}
                    {analysis && (
                      <RiskBadge
                        level={analysis.overallRiskLevel}
                        score={analysis.overallRisk}
                        size="sm"
                        showScore={false}
                      />
                    )}
                  </div>

                  {/* High Risk Indicator */}
                  {analysis?.overallRiskLevel === 'High' && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-700">
                      <span>🚨</span>
                      <span className="font-semibold">{analysis.threadThreatLevel}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadList;
