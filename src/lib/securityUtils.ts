// Security utilities for email analysis

const THREAT_KEYWORDS = [
  'verify your account',
  'click here',
  'urgent action required',
  'wire transfer',
  'bitcoin',
  'verify your password',
  'account suspended',
  'click this link',
  'confirm identity',
  'update payment',
  'immediate action',
  'act now',
  'limited time',
  'verify identity',
  'validate account'
];

const URGENCY_KEYWORDS = [
  'urgent',
  'immediately',
  'action required',
  'asap',
  'right now',
  'without delay',
  'critical',
  'emergency',
  'hurry',
  'expire'
];

const SUSPICIOUS_PATTERNS = [
  're: re: re:', // Chain of forwards
  'fwd: fwd: fwd:', // Multiple forwards
];

/**
 * Extract all URLs from text using regex
 */
export function extractLinks(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Detect threat keywords in email body and subject
 */
export function detectThreatKeywords(subject: string, body: string): string[] {
  const combinedText = `${subject} ${body}`.toLowerCase();
  return THREAT_KEYWORDS.filter(keyword => combinedText.includes(keyword));
}

/**
 * Detect urgency language
 */
export function detectUrgency(text: string): boolean {
  const lowerText = text.toLowerCase();
  return URGENCY_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract sender domain from email address
 */
export function extractDomain(email: string): string {
  const match = email.match(/@([^\s>]+)/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Detect if sender is new in the thread (introduced at index > 0)
 */
export function isNewSender(
  currentSender: string,
  previousEmails: Array<{ from: string }>,
  currentIndex: number
): boolean {
  if (currentIndex === 0) return false; // First email sender is not "new"
  
  const previousSenders = previousEmails
    .slice(0, currentIndex)
    .map(email => email.from.toLowerCase());
  
  const currentSenderLower = currentSender.toLowerCase();
  return !previousSenders.includes(currentSenderLower);
}

/**
 * Detect sudden tone change between emails
 * Compares urgency and sentiment shift
 */
export function detectToneChange(
  previousEmailBody: string | undefined,
  currentEmailBody: string
): boolean {
  if (!previousEmailBody) return false;
  
  const previousUrgency = detectUrgency(previousEmailBody);
  const currentUrgency = detectUrgency(currentEmailBody);
  
  // Tone change if previous was calm but current is urgent
  if (!previousUrgency && currentUrgency) return true;
  
  // Check for sudden shift in formality or style
  const previousLength = previousEmailBody.length;
  const currentLength = currentEmailBody.length;
  const lengthDiff = Math.abs(previousLength - currentLength) / Math.max(previousLength, 1);
  
  // Significant length change (more than 50%) combined with urgency
  if (lengthDiff > 0.5 && currentUrgency) return true;
  
  return false;
}

/**
 * Detect suspicious domain patterns
 */
export function isSuspiciousDomain(domain: string): boolean {
  // Known suspicious patterns
  const suspiciousPatterns = [
    /\.tk$/, // Uncommon TLD
    /\d{1,3}\.\d{1,3}/, // IP address domains
    /noreply/, // Generic no-reply addresses
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(domain));
}

/**
 * Calculate risk score for an email based on multiple factors
 */
export function calculateRiskScore(
  threatKeywordCount: number,
  linkCount: number,
  isNewSender: boolean,
  toneChanged: boolean,
  isSuspiciousDomain: boolean,
  hasUrgency: boolean
): number {
  let risk = 0;

  // Threat keywords: +30 points per keyword
  risk += threatKeywordCount * 30;

  // Links: +20 base, +10 per additional link
  if (linkCount > 0) {
    risk += 20 + (linkCount - 1) * 10;
  }

  // New sender: +25 points
  if (isNewSender) risk += 25;

  // Tone change: +15 points
  if (toneChanged) risk += 15;

  // Suspicious domain: +20 points
  if (isSuspiciousDomain) risk += 20;

  // Urgency language: +10 points
  if (hasUrgency) risk += 10;

  // Cap at 100
  return Math.min(risk, 100);
}

/**
 * Determine risk level based on score
 */
export function getRiskLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

/**
 * Generate explanation for detected threats
 */
export function generateExplanation(
  threatCount: number,
  linkCount: number,
  isNewSender: boolean,
  toneChanged: boolean,
  isSuspiciousDomain: boolean,
  hasUrgency: boolean,
  threats: string[]
): string {
  const reasons: string[] = [];

  if (threatCount > 0) {
    reasons.push(`${threatCount} threat keyword${threatCount > 1 ? 's' : ''} detected (${threats.slice(0, 2).join(', ')})`);
  }

  if (linkCount > 0) {
    reasons.push(`${linkCount} suspicious link${linkCount > 1 ? 's' : ''}`);
  }

  if (isNewSender) {
    reasons.push('New sender introduced in thread');
  }

  if (toneChanged) {
    reasons.push('Sudden shift in tone/urgency');
  }

  if (isSuspiciousDomain) {
    reasons.push('Suspicious domain pattern detected');
  }

  if (hasUrgency && threatCount > 0) {
    reasons.push('Urgency paired with threats (phishing indicator)');
  }

  return reasons.length > 0
    ? reasons.join('; ')
    : 'Email appears legitimate based on analyzed factors';
}
