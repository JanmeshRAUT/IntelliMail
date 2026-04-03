import React from 'react';
import type { LinkSecurityAnalysis } from '../lib/types';
import { RiskLevel } from './RiskBadge';

interface ExplanationBoxProps {
  explanation: string;
  threats: string[];
  links: string[];
  linkAnalysis?: LinkSecurityAnalysis[];
  newSender: boolean;
  toneChanged: boolean;
  riskLevel: RiskLevel;
  lstmConfidence?: number;
  lstmBand?: 'safe' | 'suspicious' | 'strong-phishing';
  mlExplanation?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

/**
 * Explanation Box - Shows detailed threat reasoning
 */
export const ExplanationBox: React.FC<ExplanationBoxProps> = ({
  explanation,
  threats,
  links,
  linkAnalysis,
  newSender,
  toneChanged,
  riskLevel,
  lstmConfidence,
  lstmBand,
  mlExplanation,
  isExpanded = true,
  onToggle,
}) => {
  const getBorderColor = () => {
    switch (riskLevel) {
      case 'Low':
        return 'border-green-200 bg-green-50';
      case 'Medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'High':
        return 'border-red-200 bg-red-50';
    }
  };

  const getTextColor = () => {
    switch (riskLevel) {
      case 'Low':
        return 'text-green-800';
      case 'Medium':
        return 'text-yellow-800';
      case 'High':
        return 'text-red-800';
    }
  };

  const indicators = [];
  if (threats.length > 0) {
    indicators.push(`${threats.length} threat keyword${threats.length > 1 ? 's' : ''}`);
  }
  if (links.length > 0) {
    indicators.push(`${links.length} suspicious link${links.length > 1 ? 's' : ''}`);
  }
  if (newSender) {
    indicators.push('New sender in thread');
  }
  if (toneChanged) {
    indicators.push('Sudden tone change');
  }

  const flaggedLinks = linkAnalysis?.filter((link) => link.phishingDetected) || [];
  const trustedLinks = linkAnalysis?.filter((link) => link.trustedDomain && !link.phishingDetected) || [];

  return (
    <div className={`rounded-xl border border-[var(--border)] p-5 shadow-sm ${getBorderColor()}`}>
      <button
        onClick={onToggle}
        className="mb-4 flex w-full items-center justify-between text-left"
      >
        <div>
          <h4 className={`font-semibold ${getTextColor()}`}>
            Analyst Summary
          </h4>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Link verdicts, sender context, and threat signals
          </p>
        </div>
        <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className={`text-sm ${getTextColor()} leading-relaxed`}>
              {explanation}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">Security Summary</p>
              <ul className="space-y-1 text-sm text-[var(--foreground)]">
                <li>Threat keywords: <span className="font-semibold">{threats.length}</span></li>
                <li>Flagged links: <span className="font-semibold">{flaggedLinks.length}</span></li>
                <li>Trusted links: <span className="font-semibold">{trustedLinks.length}</span></li>
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">Context Signals</p>
              <ul className="space-y-1 text-sm text-[var(--foreground)]">
                <li>New sender: <span className="font-semibold">{newSender ? 'Yes' : 'No'}</span></li>
                <li>Tone changed: <span className="font-semibold">{toneChanged ? 'Yes' : 'No'}</span></li>
                <li>Risk level: <span className="font-semibold">{riskLevel}</span></li>
                <li>LSTM band: <span className="font-semibold">{lstmBand || 'N/A'}</span></li>
                <li>LSTM confidence: <span className="font-semibold">{typeof lstmConfidence === 'number' ? lstmConfidence.toFixed(2) : 'N/A'}</span></li>
              </ul>
            </div>
          </div>

          {mlExplanation && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">ML Language Insight</p>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">{mlExplanation}</p>
            </div>
          )}

          {/* Threat Keywords */}
          {threats.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Detected Indicators
              </p>
              <div className="flex flex-wrap gap-2">
                {threats.map((threat, idx) => (
                  <span
                    key={idx}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      riskLevel === 'High'
                        ? 'bg-red-100 text-red-900'
                        : riskLevel === 'Medium'
                          ? 'bg-yellow-100 text-yellow-900'
                          : 'bg-green-100 text-green-900'
                    }`}
                  >
                    {threat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Link Intelligence */}
          {(linkAnalysis?.length || links.length > 0) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Link Intelligence
              </p>
              <div className="space-y-2">
                {(linkAnalysis?.length ? linkAnalysis : links.map((link) => ({
                  url: link,
                  domain: link,
                  trustedDomain: false,
                  suspiciousTld: false,
                  domainMismatch: false,
                  phishingDetected: false,
                  reason: 'Extracted link',
                } as LinkSecurityAnalysis))).map((link, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-mono text-primary-600 hover:underline"
                          title={link.url}
                        >
                          {link.url}
                        </a>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{link.reason}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                        {link.trustedDomain && !link.phishingDetected && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Trusted</span>}
                        {link.suspiciousTld && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Suspicious TLD</span>}
                        {link.domainMismatch && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Mismatch</span>}
                        {link.phishingDetected && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Flagged</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Indicators */}
          {indicators.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Risk Indicators
              </p>
              <ul className="space-y-1 text-sm">
                {indicators.map((indicator, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-lg">•</span>
                    <span>{indicator}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExplanationBox;
