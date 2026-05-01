// Main security service for analyzing email threads

import {
  extractLinks,
  detectThreatKeywords,
  detectUrgency,
  extractDomain,
  isNewSender as checkNewSender,
  detectToneChange,
  isSuspiciousDomain,
  calculateRiskScore,
  getRiskLevel,
  generateExplanation,
} from './securityUtils';

import type { Email, Thread, EmailSecurityAnalysis, ThreadSecuritySummary } from './types';

/**
 * Analyze all emails in a thread with context-aware security detection
 */
export function analyzeThreadEmails(thread: Thread): ThreadSecuritySummary {
  if (!thread.emails || thread.emails.length === 0) {
    return {
      threadId: thread.threadId,
      emails: [],
      overallRisk: 0,
      overallRiskLevel: 'Low',
      threadThreatLevel: 'No emails to analyze',
    };
  }

  // Sort emails by timestamp (oldest first)
  const sortedEmails = [...thread.emails].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const emailAnalyses: EmailSecurityAnalysis[] = [];
  let firstSuspiciousIndex: number | undefined;
  let maxRisk = 0;

  // Analyze each email in context of previous emails
  sortedEmails.forEach((email, index) => {
    const previousEmails = sortedEmails.slice(0, index);
    const previousEmailBody = index > 0 ? sortedEmails[index - 1].body : undefined;

    // Extract features
    const threatKeywords = detectThreatKeywords(email.subject, email.body);
    const links = extractLinks(email.body);
    const hasUrgency = detectUrgency(`${email.subject} ${email.body}`);
    const newSender = checkNewSender(email.from, previousEmails, index);
    const toneChanged = detectToneChange(previousEmailBody, email.body);
    const domain = extractDomain(email.from);
    const suspiciousDomain = isSuspiciousDomain(domain);

    // Calculate risk score
    const riskScore = calculateRiskScore(
      threatKeywords.length,
      links.length,
      newSender,
      toneChanged,
      suspiciousDomain,
      hasUrgency
    );

    // Determine risk level
    const riskLevel = getRiskLevel(riskScore);

    // Generate explanation
    const explanation = generateExplanation(
      threatKeywords.length,
      links.length,
      newSender,
      toneChanged,
      suspiciousDomain,
      hasUrgency,
      threatKeywords
    );

    // Track max risk and first suspicious email
    if (riskScore > maxRisk) {
      maxRisk = riskScore;
    }

    if (riskLevel === 'High' && firstSuspiciousIndex === undefined) {
      firstSuspiciousIndex = index;
    }

    const analysis: EmailSecurityAnalysis = {
      emailId: email.id,
      sender: email.from,
      riskScore,
      riskLevel,
      threats: threatKeywords,
      links,
      newSender,
      toneChanged,
      explanation,
      suspiciousIndex: index,
    };

    emailAnalyses.push(analysis);
  });

  // Calculate thread-level summary
  const overallRiskLevel = getRiskLevel(maxRisk);
  let threadThreatLevel = 'No threats detected';

  if (firstSuspiciousIndex !== undefined) {
    threadThreatLevel = `Potential threat detected at email ${firstSuspiciousIndex + 1}`;
  } else if (emailAnalyses.some(e => e.riskLevel === 'Medium')) {
    threadThreatLevel = 'Medium risk indicators present';
  }

  return {
    threadId: thread.threadId,
    emails: emailAnalyses,
    overallRisk: maxRisk,
    overallRiskLevel,
    firstSuspiciousEmailIndex: firstSuspiciousIndex,
    firstSuspiciousEmailId: firstSuspiciousIndex !== undefined 
      ? sortedEmails[firstSuspiciousIndex].id 
      : undefined,
    threadThreatLevel,
  };
}

/**
 * Batch analyze multiple threads
 */
export function analyzeMultipleThreads(threads: Thread[]): ThreadSecuritySummary[] {
  return threads.map(thread => analyzeThreadEmails(thread));
}
