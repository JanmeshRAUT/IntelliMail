import React from 'react';
import { EmailCard } from './EmailCard';
import type { ThreadSecuritySummary } from '../lib/types';

interface SecurityTimelineProps {
  summary: ThreadSecuritySummary;
  autoExpandSuspicious?: boolean;
}

/**
 * Security Timeline - Displays emails in vertical timeline with security indicators
 */
export const SecurityTimeline: React.FC<SecurityTimelineProps> = ({
  summary,
  autoExpandSuspicious = true,
}) => {
  if (!summary.emails || summary.emails.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">No emails in this thread</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Title */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Email Timeline</h3>
        <p className="text-sm text-gray-600">
          {summary.emails.length} email{summary.emails.length !== 1 ? 's' : ''} in this thread
        </p>
      </div>

      {/* Timeline Container */}
      <div className="relative space-y-3">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-gray-100" />

        {/* Email Cards */}
        {summary.emails.map((email, index) => {
          const isSuspicious = email.riskLevel === 'High';
          const isFirstSuspicious = index === summary.firstSuspiciousEmailIndex;

          return (
            <div key={email.emailId} className="relative pl-16">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-2 top-4 h-4 w-4 rounded-full border-4 transition-all ${
                  isSuspicious
                    ? 'border-red-500 bg-red-100'
                    : email.riskLevel === 'Medium'
                      ? 'border-yellow-500 bg-yellow-100'
                      : 'border-green-500 bg-green-100'
                }`}
              />

              {/* Connecting Line to Dot */}
              <div
                className={`absolute -left-1 top-4 h-0.5 w-4 ${
                  isSuspicious
                    ? 'bg-red-300'
                    : email.riskLevel === 'Medium'
                      ? 'bg-yellow-300'
                      : 'bg-green-300'
                }`}
              />

              {/* Email Card */}
              <EmailCard
                email={email}
                index={index}
                isSuspicious={isSuspicious}
                isFirstSuspicious={isFirstSuspicious}
                expanded={autoExpandSuspicious && (isSuspicious || isFirstSuspicious)}
              />
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          {summary.firstSuspiciousEmailIndex !== undefined ? (
            <>
              Suspicious activity detected starting at email #
              <span className="font-bold text-red-600">
                {summary.firstSuspiciousEmailIndex + 1}
              </span>
            </>
          ) : (
            <>No suspicious activity detected in this thread</>
          )}
        </p>
      </div>
    </div>
  );
};

export default SecurityTimeline;
