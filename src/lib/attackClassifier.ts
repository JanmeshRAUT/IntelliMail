import type { EmailSecurityAnalysis, ThreadSecuritySummary } from '../lib/types';

export type AttackType =
  | 'Phishing'
  | 'Thread Hijacking'
  | 'Spoofing'
  | 'Account Compromise'
  | 'Social Engineering'
  | 'Unknown';

interface AttackClassification {
  type: AttackType;
  confidence: 'High' | 'Medium' | 'Low';
  description: string;
}

/**
 * Classify attack type based on email analysis
 */
export function classifyEmailAttack(email: EmailSecurityAnalysis, index: number): AttackClassification {
  const threatCount = email.threats.length;
  const linkCount = email.links.length;

  // Phishing - Multiple threat keywords + links + urgency
  if (threatCount >= 2 && linkCount > 0) {
    return {
      type: 'Phishing',
      confidence: 'High',
      description: 'Classic phishing attempt with credential harvesting indicators',
    };
  }

  // Thread Hijacking - New sender + threats
  if (email.newSender && threatCount > 0) {
    return {
      type: 'Thread Hijacking',
      confidence: 'High',
      description: 'New participant introduced with malicious intent',
    };
  }

  // Spoofing - New sender with legitimate domain pattern
  if (email.newSender && threatCount > 0 && linkCount > 0) {
    return {
      type: 'Spoofing',
      confidence: 'High',
      description: 'Sender identity spoofing with link-based exploitation',
    };
  }

  // Account Compromise - Same sender, tone change, threats
  if (email.toneChanged && threatCount > 0 && index > 0) {
    return {
      type: 'Account Compromise',
      confidence: 'High',
      description: 'Account compromised with sudden unusual behavior',
    };
  }

  // Social Engineering - High urgency with moderate threats
  if (threatCount >= 1 && email.riskScore >= 40 && email.riskScore < 60) {
    return {
      type: 'Social Engineering',
      confidence: 'Medium',
      description: 'Social engineering attack attempting psychological manipulation',
    };
  }

  // Low risk but has some indicators
  if (threatCount > 0 || email.newSender) {
    return {
      type: 'Unknown',
      confidence: 'Low',
      description: 'Potential threat with unclear attack vector',
    };
  }

  return {
    type: 'Unknown',
    confidence: 'Low',
    description: 'No significant threats detected',
  };
}

/**
 * Classify thread-level attack type
 */
export function classifyThreadAttack(summary: ThreadSecuritySummary): AttackClassification {
  const highRiskEmails = summary.emails.filter((e) => e.riskLevel === 'High');
  
  if (highRiskEmails.length === 0) {
    return {
      type: 'Unknown',
      confidence: 'Low',
      description: 'No high-risk emails detected in thread',
    };
  }

  // Check for thread hijacking pattern
  const newSenderEmails = highRiskEmails.filter((e) => e.newSender);
  if (newSenderEmails.length > 0) {
    return {
      type: 'Thread Hijacking',
      confidence: 'High',
      description: `Thread hijacking detected - ${newSenderEmails.length} suspicious new sender(s)`,
    };
  }

  // Check for account compromise pattern
  const toneChangeEmails = highRiskEmails.filter((e) => e.toneChanged);
  if (toneChangeEmails.length > 0 && highRiskEmails.length === 1) {
    return {
      type: 'Account Compromise',
      confidence: 'High',
      description: 'Account compromise detected - sudden behavior change',
    };
  }

  // Check for phishing pattern
  const phishingIndicators = highRiskEmails.filter((e) => e.threats.length >= 2 && e.links.length > 0);
  if (phishingIndicators.length > 0) {
    return {
      type: 'Phishing',
      confidence: 'High',
      description: `${phishingIndicators.length} phishing email(s) detected in thread`,
    };
  }

  return {
    type: 'Unknown',
    confidence: 'Medium',
    description: 'Multiple threats detected - attack type unclear',
  };
}

/**
 * Get attack type display properties
 */
export function getAttackTypeDisplay(type: AttackType) {
  const displays: Record<AttackType, { icon: string; color: string; label: string }> = {
    'Phishing': { icon: '🎣', color: 'bg-red-100 text-red-800', label: 'Phishing Attack' },
    'Thread Hijacking': { icon: '🔓', color: 'bg-orange-100 text-orange-800', label: 'Thread Hijacking' },
    'Spoofing': { icon: '🎭', color: 'bg-purple-100 text-purple-800', label: 'Spoofing Attempt' },
    'Account Compromise': { icon: '⚠️', color: 'bg-red-100 text-red-800', label: 'Account Compromise' },
    'Social Engineering': { icon: '🎯', color: 'bg-yellow-100 text-yellow-800', label: 'Social Engineering' },
    'Unknown': { icon: '❓', color: 'bg-gray-100 text-gray-800', label: 'Unknown Threat' },
  };

  return displays[type];
}
