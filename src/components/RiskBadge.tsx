import React from 'react';

export type RiskLevel = 'Low' | 'Medium' | 'High';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

/**
 * Risk Badge Component - Displays risk level with color coding
 */
export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  size = 'md',
  showScore = true,
}) => {
  const getStyles = () => {
    switch (level) {
      case 'Low':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          icon: '✓',
        };
      case 'Medium':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          icon: '⚠️',
        };
      case 'High':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300',
          icon: '🚨',
        };
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const styles = getStyles();

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-lg font-semibold
        border ${styles.border} ${styles.bg} ${styles.text}
        ${sizeClasses[size]}
      `}
    >
      <span>{styles.icon}</span>
      <span>
        {level}
        {showScore && score !== undefined && ` Risk`}
      </span>
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-75">({score}/100)</span>
      )}
    </div>
  );
};

export default RiskBadge;
