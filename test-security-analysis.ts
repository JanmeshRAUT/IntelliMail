// Test scenarios for the Email Thread Security Analysis System
// This file demonstrates the security module with realistic examples

import { analyzeThreadEmails } from './src/lib/securityService';
import type { Thread, Email } from './src/lib/types';

// === TEST 1: Legitimate Business Communication ===
const legitimateThread: Thread = {
  threadId: 'thread-001',
  emails: [
    {
      id: 'email-001-1',
      threadId: 'thread-001',
      subject: 'Q2 Project Planning',
      from: 'manager@acme.com',
      to: ['team@acme.com'],
      body: 'Hi team, let\'s discuss the Q2 timeline and deliverables. We\'ll have kickoff tomorrow at 2 PM.',
      timestamp: '2026-04-01T09:00:00Z',
    },
    {
      id: 'email-001-2',
      threadId: 'thread-001',
      subject: 'RE: Q2 Project Planning',
      from: 'developer@acme.com',
      to: ['manager@acme.com', 'team@acme.com'],
      body: 'Sounds good. I\'ve prepared the technical architecture document. See attached.',
      timestamp: '2026-04-01T10:30:00Z',
    },
  ],
  participants: ['manager@acme.com', 'developer@acme.com', 'team@acme.com'],
};

console.log('=== TEST 1: Legitimate Business Thread ===');
const result1 = analyzeThreadEmails(legitimateThread);
console.log('Overall Risk Level:', result1.overallRiskLevel); // Expected: Low
console.log('Thread Threat Level:', result1.threadThreatLevel); // Expected: No threats detected
console.log('---\n');

// === TEST 2: Phishing Thread ===
const phishingThread: Thread = {
  threadId: 'thread-002',
  emails: [
    {
      id: 'email-002-1',
      threadId: 'thread-002',
      subject: 'Important Security Notice',
      from: 'support@bank-security.net',
      to: ['customer@gmail.com'],
      body: 'Dear customer, we need to verify your account immediately. Please click here to confirm your identity and update your payment information.',
      timestamp: '2026-04-02T08:00:00Z',
    },
    {
      id: 'email-002-2',
      threadId: 'thread-002',
      subject: 'URGENT: Account Suspended',
      from: 'security@bankofamerica.com.suspicious.tk',
      to: ['customer@gmail.com'],
      body: 'URGENT ACTION REQUIRED! Your account has been suspended. Wire transfer verification needed. Click here immediately: http://malicious-site.xyz/verify?token=abc123',
      timestamp: '2026-04-02T09:15:00Z',
    },
  ],
  participants: ['support@bank-security.net', 'security@bankofamerica.com.suspicious.tk', 'customer@gmail.com'],
};

console.log('=== TEST 2: Phishing Detection ===');
const result2 = analyzeThreadEmails(phishingThread);
console.log('Overall Risk Level:', result2.overallRiskLevel); // Expected: High
console.log('Thread Threat Level:', result2.threadThreatLevel); // Expected: Potential threat detected at email 1 or 2
console.log('First Suspicious Email Index:', result2.firstSuspiciousEmailIndex);
console.log('Email Details:');
result2.emails.forEach((email, idx) => {
  console.log(`  Email ${idx + 1}: Risk ${email.riskScore}/100 (${email.riskLevel})`);
  console.log(`    Threats: ${email.threats.join(', ') || 'None'}`);
  console.log(`    Links: ${email.links.length}`);
  console.log(`    ${email.explanation}`);
});
console.log('---\n');

// === TEST 3: Thread Hijacking ===
const threadHijackingThread: Thread = {
  threadId: 'thread-003',
  emails: [
    {
      id: 'email-003-1',
      threadId: 'thread-003',
      subject: 'Team Meeting Notes',
      from: 'john@company.com',
      to: ['jane@company.com'],
      body: 'Hi Jane, thanks for the productive meeting today. Great feedback on the proposal.',
      timestamp: '2026-04-01T14:00:00Z',
    },
    {
      id: 'email-003-2',
      threadId: 'thread-003',
      subject: 'RE: Team Meeting Notes',
      from: 'jane@company.com',
      to: ['john@company.com'],
      body: 'You\'re welcome! Looking forward to next week\'s follow-up.',
      timestamp: '2026-04-01T15:30:00Z',
    },
    {
      id: 'email-003-3',
      threadId: 'thread-003',
      subject: 'RE: Team Meeting Notes',
      from: 'john.finance@free.tk', // New sender, spoofed domain
      to: ['jane@company.com'],
      body: 'Hi Jane, can you urgently wire transfer $50,000 for the project? Click here to confirm payment: http://fake-banking.com/payment',
      timestamp: '2026-04-02T08:00:00Z',
    },
  ],
  participants: ['john@company.com', 'jane@company.com', 'john.finance@free.tk'],
};

console.log('=== TEST 3: Thread Hijacking Detection ===');
const result3 = analyzeThreadEmails(threadHijackingThread);
console.log('Overall Risk Level:', result3.overallRiskLevel); // Expected: High
console.log('Thread Threat Level:', result3.threadThreatLevel);
console.log('First Suspicious Email Index:', result3.firstSuspiciousEmailIndex);
console.log('Suspicious Email Details:');
const suspiciousEmail = result3.emails[result3.firstSuspiciousEmailIndex!];
if (suspiciousEmail) {
  console.log(`  Risk Score: ${suspiciousEmail.riskScore}/100`);
  console.log(`  New Sender: ${suspiciousEmail.newSender}`);
  console.log(`  Threats Found: ${suspiciousEmail.threats.join(', ')}`);
  console.log(`  Links Found: ${suspiciousEmail.links.length}`);
  console.log(`  Explanation: ${suspiciousEmail.explanation}`);
}
console.log('---\n');

// === TEST 4: Legitimate Email with High Link Density ===
const newsletterThread: Thread = {
  threadId: 'thread-004',
  emails: [
    {
      id: 'email-004-1',
      threadId: 'thread-004',
      subject: 'Weekly Newsletter: Tech Updates',
      from: 'newsletter@techblog.com',
      to: ['subscriber@gmail.com'],
      body: 'Check out this week\'s tech stories: https://techblog.com/story1 | https://techblog.com/story2 | https://techblog.com/story3. Thanks for subscribing!',
      timestamp: '2026-04-03T07:00:00Z',
    },
  ],
  participants: ['newsletter@techblog.com', 'subscriber@gmail.com'],
};

console.log('=== TEST 4: High Link Density (Legitimate) ===');
const result4 = analyzeThreadEmails(newsletterThread);
console.log('Overall Risk Level:', result4.overallRiskLevel); // Expected: Low/Medium
console.log('Risk Score:', result4.emails[0].riskScore);
console.log('Links Found:', result4.emails[0].links.length);
console.log('Explanation:', result4.emails[0].explanation);
console.log('---\n');

// === TEST 5: Tone Change Detection ===
const toneChangeThread: Thread = {
  threadId: 'thread-005',
  emails: [
    {
      id: 'email-005-1',
      threadId: 'thread-005',
      subject: 'Vacation Plans',
      from: 'sarah@email.com',
      to: ['friend@email.com'],
      body: 'Hi! I\'m thinking about taking a vacation next month. Let me know if you\'re interested in joining me. Hope to hear from you soon!',
      timestamp: '2026-04-01T12:00:00Z',
    },
    {
      id: 'email-005-2',
      threadId: 'thread-005',
      subject: 'RE: Vacation Plans',
      from: 'sarah@email.com',
      to: ['friend@email.com'],
      body: 'URGENT!!! Verify your account immediately!!! Click here now: http://suspicious.com/verify. Banking information required. Act now!!!',
      timestamp: '2026-04-01T13:00:00Z',
    },
  ],
  participants: ['sarah@email.com', 'friend@email.com'],
};

console.log('=== TEST 5: Tone Change Detection (Same Sender) ===');
const result5 = analyzeThreadEmails(toneChangeThread);
console.log('Overall Risk Level:', result5.overallRiskLevel); // Expected: High
console.log('First Email Risk:', result5.emails[0].riskScore, `(${result5.emails[0].riskLevel})`);
console.log('Second Email Risk:', result5.emails[1].riskScore, `(${result5.emails[1].riskLevel})`);
console.log('Tone Changed:', result5.emails[1].toneChanged); // Expected: true
console.log('New Sender:', result5.emails[1].newSender); // Expected: false
console.log('Explanation:', result5.emails[1].explanation);
console.log('---\n');

console.log('=== ALL TESTS COMPLETE ===');
console.log('Expected Results Summary:');
console.log('- Test 1 (Legitimate): Low Risk');
console.log('- Test 2 (Phishing): High Risk with multiple threats');
console.log('- Test 3 (Thread Hijack): High Risk detected at email 3');
console.log('- Test 4 (Newsletter): Low/Medium Risk despite high link count');
console.log('- Test 5 (Tone Change): High Risk, same sender but abnormal behavior');
