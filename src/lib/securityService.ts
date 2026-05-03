// Main security service for analyzing email threads

import axios from 'axios';

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

import type { Email, Thread, EmailSecurityAnalysis, ThreadSecuritySummary, LinkSecurityAnalysis } from './types';

const ML_SERVICE_URL = (typeof process !== 'undefined' && (process.env.ML_SERVICE_URL || process.env.VITE_ML_SERVICE_URL)) || 
                       (typeof import.meta !== 'undefined' && ((import.meta as any).env?.ML_SERVICE_URL || (import.meta as any).env?.VITE_ML_SERVICE_URL)) || 
                       'http://localhost:5000';
const TRUSTED_DOMAINS = ['coursera.org', 'google.com', 'microsoft.com', 'linkedin.com'];
const SUSPICIOUS_TLDS = ['xyz', 'ru', 'tk'];

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '').trim();
}

function extractUrlDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
    return normalizeDomain(parsed.hostname);
  } catch {
    return '';
  }
}

function isTrustedDomain(domain: string): boolean {
  const cleanDomain = normalizeDomain(domain);
  return TRUSTED_DOMAINS.some(
    (trusted) => cleanDomain === trusted || cleanDomain.endsWith(`.${trusted}`)
  );
}

function isSuspiciousTld(domain: string): boolean {
  const cleanDomain = normalizeDomain(domain);
  return SUSPICIOUS_TLDS.some(
    (tld) => cleanDomain.endsWith(`.${tld}`) || cleanDomain === tld
  );
}

function domainsMatch(senderDomain: string, linkDomain: string): boolean {
  const sender = normalizeDomain(senderDomain);
  const link = normalizeDomain(linkDomain);

  if (!sender || !link) {
    return false;
  }

  return (
    sender === link ||
    sender.endsWith(`.${link}`) ||
    link.endsWith(`.${sender}`)
  );
}

function buildTrustedLegitimateConfidence(trustedSenderDomain: boolean, maliciousLinkCount: number, suspiciousDomain: boolean, newSender: boolean, toneChanged: boolean): string | undefined {
  if (trustedSenderDomain && maliciousLinkCount === 0 && !suspiciousDomain && !newSender && !toneChanged) {
    return 'High (Legitimate)';
  }

  return undefined;
}

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
      timestamp: email.timestamp,
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

async function scoreUrlWithMl(url: string): Promise<{ prediction: 'phishing' | 'legitimate'; confidence: number } | null> {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict-url`, { url }, { timeout: 8000 });
    const data = response.data as { prediction?: string; confidence?: number };

    if (data.prediction !== 'phishing' && data.prediction !== 'legitimate') {
      return null;
    }

    return {
      prediction: data.prediction,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    };
  } catch (error) {
    console.warn(`ML URL scoring failed for ${url}:`, error);
    return null;
  }
}

/**
 * Analyze a single email using local signals plus the ML URL model.
 */
async function analyzeEmailWithMl(
  email: Email,
  previousEmails: Email[],
  index: number
): Promise<EmailSecurityAnalysis> {
  const links = extractLinks(email.body);
  const newSender = checkNewSender(email.from, previousEmails, index);
  const previousEmailBody = index > 0 ? previousEmails[index - 1]?.body : undefined;
  const toneChanged = detectToneChange(previousEmailBody, email.body);
  const domain = extractDomain(email.from);
  const suspiciousDomain = isSuspiciousDomain(domain);
  const trustedSenderDomain = isTrustedDomain(domain);

  const linkAnalysis: LinkSecurityAnalysis[] = [];

  for (const link of links) {
    const linkDomain = extractUrlDomain(link);
    const trustedLinkDomain = isTrustedDomain(linkDomain);
    const suspiciousTld = isSuspiciousTld(linkDomain);
    const domainMismatch = Boolean(linkDomain) && Boolean(domain) && !domainsMatch(domain, linkDomain) && !trustedLinkDomain;
    const mlResult = await scoreUrlWithMl(link);
    const phishingDetected = Boolean(mlResult?.prediction === 'phishing' || suspiciousTld || domainMismatch);

    linkAnalysis.push({
      url: link,
      domain: linkDomain,
      trustedDomain: trustedLinkDomain,
      suspiciousTld,
      domainMismatch,
      phishingDetected,
      confidence: mlResult?.confidence,
      reason: phishingDetected
        ? suspiciousTld
          ? `Suspicious TLD detected (${linkDomain})`
          : domainMismatch
            ? `Domain mismatch detected (${linkDomain})`
            : `ML flagged URL as phishing (${Math.round((mlResult?.confidence || 0) * 100)}%)`
        : trustedLinkDomain
          ? 'Trusted destination domain'
          : 'No phishing indicators found',
    });
  }

  const maliciousLinks = linkAnalysis.filter((item) => item.phishingDetected);
  const bulkEmailCandidate =
    links.length > 10 &&
    trustedSenderDomain &&
    maliciousLinks.length === 0 &&
    !newSender &&
    !toneChanged &&
    !suspiciousDomain;

  let riskScore = 0;

  if (trustedSenderDomain && maliciousLinks.length === 0) {
    riskScore -= 25;
  }

  if (maliciousLinks.length > 0) {
    riskScore += 30;
  } else if (bulkEmailCandidate) {
    riskScore += 5;
  }

  if (newSender) {
    riskScore += 25;
  }

  if (toneChanged) {
    riskScore += 15;
  }

  if (suspiciousDomain) {
    riskScore += 20;
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  const riskLevel = getRiskLevel(riskScore);

  const legitimateConfidence = buildTrustedLegitimateConfidence(
    trustedSenderDomain,
    maliciousLinks.length,
    suspiciousDomain,
    newSender,
    toneChanged
  );

  const explanation = bulkEmailCandidate
    ? 'Email contains many links typical of marketing newsletters from trusted sources'
    : maliciousLinks.length > 0
      ? `${maliciousLinks.length} malicious or mismatched link${maliciousLinks.length > 1 ? 's' : ''} detected`
      : legitimateConfidence
        ? 'Trusted domain with no malicious link indicators'
        : generateExplanation(
            0,
            links.length,
            newSender,
            toneChanged,
            suspiciousDomain,
            false,
            []
          );

  const linkThreatLabels = maliciousLinks.map((item) => item.reason);

  return {
    emailId: email.id,
    sender: email.from,
    riskScore,
    riskLevel,
    threats: linkThreatLabels,
    links,
    linkAnalysis,
    newSender,
    toneChanged,
    explanation,
    suspiciousIndex: index,
    trustedDomain: trustedSenderDomain,
    bulkEmailCandidate,
    confidenceLabel: legitimateConfidence,
    attackType: bulkEmailCandidate ? 'Marketing / Bulk Email' : undefined,
    timestamp: email.timestamp,
  };
}

/**
 * Analyze an entire thread using the ML-backed URL service.
 */
export async function analyzeThreadEmailsWithMl(thread: Thread): Promise<ThreadSecuritySummary> {
  if (!thread.emails || thread.emails.length === 0) {
    return {
      threadId: thread.threadId,
      emails: [],
      overallRisk: 0,
      overallRiskLevel: 'Low',
      threadThreatLevel: 'No emails to analyze',
    };
  }

  const sortedEmails = [...thread.emails].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const analyses: EmailSecurityAnalysis[] = [];
  let firstSuspiciousIndex: number | undefined;
  let maxRisk = 0;

  for (let index = 0; index < sortedEmails.length; index += 1) {
    const analysis = await analyzeEmailWithMl(sortedEmails[index], sortedEmails.slice(0, index), index);
    analyses.push(analysis);

    if (analysis.riskScore > maxRisk) {
      maxRisk = analysis.riskScore;
    }

    if (analysis.riskLevel === 'High' && firstSuspiciousIndex === undefined) {
      firstSuspiciousIndex = index;
    }
  }

  const overallRiskLevel = getRiskLevel(maxRisk);
  const threadThreatLevel = firstSuspiciousIndex !== undefined
    ? `Potential threat detected at email ${firstSuspiciousIndex + 1}`
    : analyses.some((email) => email.riskLevel === 'Medium')
      ? 'Medium risk indicators present'
      : 'No threats detected';

  const bulkEmailCandidate = analyses.some((email) => email.bulkEmailCandidate);
  const trustedDomain = analyses.some((email) => email.trustedDomain);
  const confidenceLabel = analyses.some((email) => email.confidenceLabel === 'High (Legitimate)')
    ? 'High (Legitimate)'
    : undefined;
  const attackType = bulkEmailCandidate ? 'Marketing / Bulk Email' : undefined;

  const finalThreadThreatLevel = bulkEmailCandidate
    ? 'Marketing / Bulk Email'
    : threadThreatLevel === 'No threats detected' && confidenceLabel
      ? 'Trusted domain with no malicious indicators'
      : threadThreatLevel;

  return {
    threadId: thread.threadId,
    emails: analyses,
    overallRisk: maxRisk,
    overallRiskLevel,
    firstSuspiciousEmailIndex: firstSuspiciousIndex,
    firstSuspiciousEmailId: firstSuspiciousIndex !== undefined ? sortedEmails[firstSuspiciousIndex].id : undefined,
    threadThreatLevel: finalThreadThreatLevel,
    bulkEmailCandidate,
    trustedDomain,
    confidenceLabel,
    attackType,
  };
}

/**
 * Batch analyze multiple threads
 */
export function analyzeMultipleThreads(threads: Thread[]): ThreadSecuritySummary[] {
  return threads.map(thread => analyzeThreadEmails(thread));
}

/**
 * Batch analyze multiple threads with the ML URL service.
 */
export async function analyzeMultipleThreadsWithMl(threads: Thread[]): Promise<ThreadSecuritySummary[]> {
  const results: ThreadSecuritySummary[] = [];

  for (const thread of threads) {
    results.push(await analyzeThreadEmailsWithMl(thread));
  }

  return results;
}
