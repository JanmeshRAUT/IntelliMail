import React from 'react';
import { RiskLevel } from './RiskBadge';

interface ExplanationBoxProps {
  explanation: string;
  threats: string[];
  links: string[];
  newSender: boolean;
  toneChanged: boolean;
  riskLevel: RiskLevel;
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
  newSender,
  toneChanged,
  riskLevel,
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

  return (
    <div className={`rounded-lg border-l-4 p-4 ${getBorderColor()}`}>
      <button
        onClick={onToggle}
        className="mb-3 flex w-full items-center justify-between"
      >
        <h4 className={`font-semibold ${getTextColor()}`}>
          This email is suspicious because:
        </h4>
        <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          <p className={`text-sm ${getTextColor()} leading-relaxed`}>
            {explanation}
          </p>

          {/* Threat Keywords */}
          {threats.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase opacity-70">
                Detected Keywords:
              </p>
              <div className="flex flex-wrap gap-2">
                {threats.map((threat, idx) => (
                  <span
                    key={idx}
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      riskLevel === 'High'
                        ? 'bg-red-200 text-red-900'
                        : riskLevel === 'Medium'
                          ? 'bg-yellow-200 text-yellow-900'
                          : 'bg-green-200 text-green-900'
                    }`}
                  >
                    "{threat}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suspicious Links */}
          {links.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase opacity-70">
                Extracted Links:
              </p>
              <div className="space-y-1">
                {links.map((link, idx) => (
                  <div key={idx} className="rounded bg-black/5 p-2 text-xs font-mono">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-600 hover:underline"
                      title={link}
                    >
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Indicators */}
          {indicators.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase opacity-70">
                Risk Indicators:
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
