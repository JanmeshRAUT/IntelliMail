import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { getEmails } from '../lib/localData';
import type { Thread as SecurityThread, ThreadSecuritySummary, EmailSecurityAnalysis } from '../lib/types';

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

function riskPill(level: 'Low' | 'Medium' | 'High') {
  if (level === 'High') return 'bg-red-100 text-red-700 border-red-200';
  if (level === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

export default function SecurityReportPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ThreadSecuritySummary | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!threadId) {
        setError('Missing thread id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const threadEmails = getEmails().filter((email) => email.threadId === threadId);
        if (threadEmails.length === 0) {
          throw new Error('Thread not found in local cache. Sync Gmail and try again.');
        }

        const participants = Array.from(new Set(threadEmails.map((email) => email.from)));
        const securityThread: SecurityThread = {
          threadId,
          participants,
          emails: threadEmails.map((email) => ({
            id: email.id,
            threadId: email.threadId,
            subject: email.subject,
            from: email.from,
            to: [],
            body: email.body,
            snippet: email.snippet,
            timestamp: email.timestamp,
          })),
        };

        const response = await axios.post('/api/security/analyze-thread', { thread: securityThread });
        const payload = response.data as { success?: boolean; data?: ThreadSecuritySummary; error?: string };

        if (!payload.success || !payload.data) {
          throw new Error(payload.error || 'Could not generate security report');
        }

        setSummary(payload.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error while generating report';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [threadId]);

  const metrics = useMemo(() => {
    if (!summary) {
      return {
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
        flaggedLinks: 0,
      };
    }

    const high = summary.emails.filter((email) => email.riskLevel === 'High').length;
    const medium = summary.emails.filter((email) => email.riskLevel === 'Medium').length;
    const low = summary.emails.filter((email) => email.riskLevel === 'Low').length;
    const flaggedLinks = summary.emails.reduce(
      (sum, email) => sum + (email.linkAnalysis?.filter((link) => link.phishingDetected).length || 0),
      0
    );

    return {
      total: summary.emails.length,
      high,
      medium,
      low,
      flaggedLinks,
    };
  }, [summary]);

  const topFindings = useMemo(() => {
    if (!summary) {
      return [];
    }

    const findingSet = new Set<string>();
    for (const email of summary.emails) {
      for (const threat of email.threats) {
        findingSet.add(threat);
      }
    }

    return Array.from(findingSet).slice(0, 8);
  }, [summary]);

  const highestRiskEmail: EmailSecurityAnalysis | undefined = useMemo(() => {
    if (!summary || summary.emails.length === 0) {
      return undefined;
    }

    return [...summary.emails].sort((a, b) => b.riskScore - a.riskScore)[0];
  }, [summary]);

  return (
    <div className="min-h-full bg-[var(--background)] text-[var(--foreground)] px-8 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-primary-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            <FileText className="h-3.5 w-3.5" />
            Structured Report
          </span>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-sm text-[var(--muted-foreground)]">
            Generating security report...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {summary && (
          <>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Thread Report</p>
                  <h1 className="mt-2 text-3xl font-black">Security Analysis Report</h1>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Thread ID: {summary.threadId}</p>
                </div>
                <span className={cn('rounded-full border px-3 py-1 text-sm font-semibold', riskPill(summary.overallRiskLevel))}>
                  {summary.overallRiskLevel} Risk ({summary.overallRisk}/100)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Total Emails</p>
                <p className="mt-2 text-2xl font-black">{metrics.total}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase text-red-700">High</p>
                <p className="mt-2 text-2xl font-black text-red-900">{metrics.high}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase text-amber-700">Medium</p>
                <p className="mt-2 text-2xl font-black text-amber-900">{metrics.medium}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase text-emerald-700">Low</p>
                <p className="mt-2 text-2xl font-black text-emerald-900">{metrics.low}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Flagged Links</p>
                <p className="mt-2 text-2xl font-black">{metrics.flaggedLinks}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Top Findings</h2>
                {topFindings.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {topFindings.map((finding) => (
                      <li key={finding} className="rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm">
                        {finding}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">No explicit threat keywords detected.</p>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Model Insight</h2>
                {highestRiskEmail ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="font-semibold">Email sender:</span> {highestRiskEmail.sender}
                    </p>
                    <p>
                      <span className="font-semibold">LSTM band:</span> {highestRiskEmail.lstmBand || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">LSTM confidence:</span>{' '}
                      {typeof highestRiskEmail.lstmConfidence === 'number' ? highestRiskEmail.lstmConfidence.toFixed(2) : 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">Interpretation:</span> {highestRiskEmail.mlExplanation || 'No model narrative available'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">No email-level model insight available.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Email Risk Table</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                      <th className="px-2 py-3">Email</th>
                      <th className="px-2 py-3">Sender</th>
                      <th className="px-2 py-3">Risk</th>
                      <th className="px-2 py-3">Flagged Links</th>
                      <th className="px-2 py-3">LSTM</th>
                      <th className="px-2 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.emails.map((email, idx) => {
                      const flagged = email.linkAnalysis?.filter((link) => link.phishingDetected).length || 0;
                      return (
                        <tr key={email.emailId} className="border-b border-[var(--border)]/70">
                          <td className="px-2 py-3 font-medium">#{idx + 1}</td>
                          <td className="px-2 py-3">{email.sender}</td>
                          <td className="px-2 py-3">
                            <span className={cn('rounded-full border px-2 py-1 text-xs font-semibold', riskPill(email.riskLevel))}>
                              {email.riskLevel} ({email.riskScore})
                            </span>
                          </td>
                          <td className="px-2 py-3">{flagged}</td>
                          <td className="px-2 py-3">
                            {typeof email.lstmConfidence === 'number' ? email.lstmConfidence.toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-2 py-3 text-[var(--muted-foreground)]">{formatDate(email.timestamp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Recommendations</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 text-primary-600" />
                  Verify sender intent for emails marked Medium/High risk.
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
                  Review flagged links before clicking; prefer opening trusted domains directly.
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
                  Monitor language-shift alerts from LSTM even when link scores are low.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
                  Keep known trusted newsletter domains whitelisted and periodically review exceptions.
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
