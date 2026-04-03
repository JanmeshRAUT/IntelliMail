import React, { useState } from 'react';
import { RiskBadge } from './RiskBadge';
import { ExplanationBox } from './ExplanationBox';
import { classifyEmailAttack, getAttackTypeDisplay } from '../lib/attackClassifier';
import type { EmailSecurityAnalysis } from '../lib/types';

interface EmailCardProps {
  email: EmailSecurityAnalysis;
  index: number;
  isSuspicious: boolean;
  isFirstSuspicious: boolean;
  expanded?: boolean;
}

/**
 * Email Card Component - Displays individual email with security analysis
 */
export const EmailCard: React.FC<EmailCardProps> = ({
  email,
  index,
  isSuspicious,
  isFirstSuspicious,
  expanded: defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [explanationExpanded, setExplanationExpanded] = useState(defaultExpanded);
  
  const attack = classifyEmailAttack(email, index);
  const attackDisplay = getAttackTypeDisplay(attack.type);

  const getBorderStyle = () => {
    if (isSuspicious) {
      return 'border-l-4 border-red-500 bg-red-50';
    }
    return 'border-l-4 border-gray-200 bg-white';
  };

  const parseTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className={`rounded-lg shadow-sm transition-all ${getBorderStyle()}`}>
      {/* Header - Click to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-black/2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Email number and sender */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
              <div>
                <p className="font-semibold text-gray-900">{email.sender}</p>
                <p className="text-xs text-gray-500">{parseTimestamp(email?.timestamp || '')}</p>
              </div>
            </div>

            {/* Subject preview */}
            <p className="mt-2 text-sm text-gray-600">{email.emailId}</p>
          </div>

          {/* Right side - Risk badge and icons */}
          <div className="flex flex-col items-end gap-2">
            <RiskBadge level={email.riskLevel} score={email.riskScore} size="sm" />
            
            {isFirstSuspicious && (
              <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                First Suspicious
              </span>
            )}

            <span className="text-2xl">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Attack Type Badge */}
          {isSuspicious && (
            <div
              className={`rounded-lg px-3 py-2 font-semibold flex items-center gap-2 ${attackDisplay.color}`}
            >
              <span className="text-lg">{attackDisplay.icon}</span>
              <span>{attackDisplay.label}</span>
              <span className="ml-auto text-xs opacity-75">
                {attack.confidence} Confidence
              </span>
            </div>
          )}

          {/* Email Details */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-600">From:</p>
              <p className="text-sm font-mono text-gray-900">{email.sender}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-600">Email ID:</p>
              <p className="truncate text-sm font-mono text-gray-900">{email.emailId}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold uppercase text-gray-600">Timestamp:</p>
              <p className="text-sm text-gray-900">{parseTimestamp(email?.timestamp || '')}</p>
            </div>
          </div>

          {/* Risk Score with Progress Bar */}
          <div>
            <div className="mb-2 flex justify-between">
              <p className="text-sm font-semibold text-gray-700">Risk Score</p>
              <p className="text-sm font-bold text-gray-900">{email.riskScore}/100</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full transition-all ${
                  email.riskLevel === 'High'
                    ? 'bg-red-500'
                    : email.riskLevel === 'Medium'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${email.riskScore}%` }}
              />
            </div>
          </div>

          {/* Explanation Box */}
          <ExplanationBox
            explanation={email.explanation}
            threats={email.threats}
            links={email.links}
            newSender={email.newSender}
            toneChanged={email.toneChanged}
            riskLevel={email.riskLevel}
            isExpanded={explanationExpanded}
            onToggle={() => setExplanationExpanded(!explanationExpanded)}
          />

          {/* Risk Factors Summary */}
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="mb-3 text-xs font-semibold uppercase text-gray-600">Risk Factors:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Threat Keywords', value: email.threats.length, active: email.threats.length > 0 },
                { label: 'Suspicious Links', value: email.links.length, active: email.links.length > 0 },
                { label: 'New Sender', value: email.newSender ? 'Yes' : 'No', active: email.newSender },
                { label: 'Tone Changed', value: email.toneChanged ? 'Yes' : 'No', active: email.toneChanged },
              ].map((factor, idx) => (
                <div
                  key={idx}
                  className={`rounded px-2 py-1 text-xs ${
                    factor.active ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <span className="font-semibold">{factor.label}:</span> {factor.value}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCard;
