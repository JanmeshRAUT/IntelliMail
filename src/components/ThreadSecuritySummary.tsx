import React from 'react';
import { RiskBadge } from './RiskBadge';
import { classifyThreadAttack, getAttackTypeDisplay } from '../lib/attackClassifier';
import type { ThreadSecuritySummary as ThreadSecuritySummaryType } from '../lib/types';

interface ThreadSecuritySummaryProps {
  summary: ThreadSecuritySummaryType;
  participantCount: number;
}

/**
 * Thread Security Summary - Shows overall thread threat assessment
 */
export const ThreadSecuritySummary: React.FC<ThreadSecuritySummaryProps> = ({
  summary,
  participantCount,
}) => {
  const attack = classifyThreadAttack(summary);
  const attackDisplay = getAttackTypeDisplay(attack.type);
  const showAttackClassification = summary.overallRiskLevel !== 'Low' && attack.type !== 'Unknown';

  const highRiskCount = summary.emails.filter((e) => e.riskLevel === 'High').length;
  const mediumRiskCount = summary.emails.filter((e) => e.riskLevel === 'Medium').length;
  const lowRiskCount = summary.emails.filter((e) => e.riskLevel === 'Low').length;
  const trustedSignals = summary.trustedDomain || summary.confidenceLabel === 'High (Legitimate)';
  const recommendation = summary.overallRiskLevel === 'High'
    ? 'Escalate and review immediately'
    : summary.overallRiskLevel === 'Medium'
      ? 'Monitor and verify sender intent'
      : trustedSignals
        ? 'No action required - trusted communication'
        : 'Low risk - continue standard monitoring';

  const getHeaderColor = () => {
    switch (summary.overallRiskLevel) {
      case 'High':
        return 'bg-red-50 border-red-200';
      case 'Medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'Low':
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${getHeaderColor()}`}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gray-700">
            Security Report
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">Thread Security Analysis</h2>
          <p className="text-sm text-gray-600">
            Thread ID: <span className="font-mono">{summary.threadId}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {summary.confidenceLabel && <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-gray-700">{summary.confidenceLabel}</span>}
            {summary.attackType && <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-gray-700">{summary.attackType}</span>}
            {trustedSignals && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Trusted signal</span>}
          </div>
        </div>
        <RiskBadge
          level={summary.overallRiskLevel}
          score={summary.overallRisk}
          size="lg"
          showScore={true}
        />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-white/70 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Risk Position</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{summary.overallRisk}/100</p>
        </div>
        <div className="rounded-xl bg-white/70 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Emails</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{summary.emails.length}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Recommendation</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 leading-relaxed">{recommendation}</p>
        </div>
      </div>

      {/* Attack Classification */}
      {showAttackClassification && (
        <div className={`mb-6 rounded-lg px-4 py-3 font-semibold flex items-center gap-3 ${attackDisplay.color}`}>
          <span className="text-2xl">{attackDisplay.icon}</span>
          <div>
            <p className="font-bold">{attackDisplay.label}</p>
            <p className="text-xs opacity-75">Confidence: {attack.confidence}</p>
          </div>
          <div className="ml-auto text-sm text-center">
            <p className="font-bold">{attack.description}</p>
          </div>
        </div>
      )}

      {/* Thread Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {/* Total Emails */}
        <div className="rounded-xl bg-white/70 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-600">Total Emails</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.emails.length}</p>
        </div>

        {/* Participants */}
        <div className="rounded-xl bg-white/70 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-600">Participants</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{participantCount}</p>
        </div>

        {/* High Risk Emails */}
        <div className="rounded-xl bg-red-100/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-red-700">High Risk</p>
          <p className="mt-2 text-3xl font-bold text-red-900">{highRiskCount}</p>
        </div>

        {/* Medium Risk Emails */}
        <div className="rounded-xl bg-yellow-100/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-yellow-700">Medium Risk</p>
          <p className="mt-2 text-3xl font-bold text-yellow-900">{mediumRiskCount}</p>
        </div>
      </div>

      {/* Risk Distribution */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">Risk Distribution</p>
        <div className="flex h-8 overflow-hidden rounded-full bg-gray-200 shadow-inner">
          {lowRiskCount > 0 && (
            <div
              className="bg-green-500"
              style={{ width: `${(lowRiskCount / summary.emails.length) * 100}%` }}
              title={`Low: ${lowRiskCount}`}
            />
          )}
          {mediumRiskCount > 0 && (
            <div
              className="bg-yellow-500"
              style={{ width: `${(mediumRiskCount / summary.emails.length) * 100}%` }}
              title={`Medium: ${mediumRiskCount}`}
            />
          )}
          {highRiskCount > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(highRiskCount / summary.emails.length) * 100}%` }}
              title={`High: ${highRiskCount}`}
            />
          )}
        </div>
        <div className="mt-2 flex gap-4 text-xs">
          <span>
            <span className="inline-block h-3 w-3 rounded-full bg-green-500 align-middle"></span>{' '}
            Low: {lowRiskCount}
          </span>
          <span>
            <span className="inline-block h-3 w-3 rounded-full bg-yellow-500 align-middle"></span>{' '}
            Medium: {mediumRiskCount}
          </span>
          <span>
            <span className="inline-block h-3 w-3 rounded-full bg-red-500 align-middle"></span>{' '}
            High: {highRiskCount}
          </span>
        </div>
      </div>

      {/* First Suspicious Email Alert */}
      {summary.firstSuspiciousEmailIndex !== undefined && (
        <div className="mt-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-red-900">
            <span className="text-xl">⚠️</span>
            First Suspicious Email at Position #{summary.firstSuspiciousEmailIndex + 1}
          </p>
          <p className="mt-1 text-sm text-red-800">
            {summary.firstSuspiciousEmailId ? `Email ID: ${summary.firstSuspiciousEmailId}` : ''}
          </p>
        </div>
      )}

      {/* Thread Threat Level */}
      <div className="mt-6 rounded-xl bg-white/70 p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-gray-600 mb-2">Threat Assessment</p>
        <p className="text-sm font-semibold text-gray-900">{summary.threadThreatLevel}</p>
        {summary.attackType && summary.attackType !== 'Unknown' && (
          <p className="mt-1 text-sm font-medium text-gray-700">Type: {summary.attackType}</p>
        )}
      </div>
    </div>
  );
};

export default ThreadSecuritySummary;
