// Email and Thread types for security analysis

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  snippet?: string;
  timestamp: string;
}

export interface Thread {
  threadId: string;
  emails: Email[];
  participants: string[];
}

export interface EmailSecurityAnalysis {
  emailId: string;
  sender: string;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  threats: string[];
  links: string[];
  newSender: boolean;
  toneChanged: boolean;
  explanation: string;
  suspiciousIndex?: number;
}

export interface ThreadSecuritySummary {
  threadId: string;
  emails: EmailSecurityAnalysis[];
  overallRisk: number;
  overallRiskLevel: 'Low' | 'Medium' | 'High';
  firstSuspiciousEmailIndex?: number;
  firstSuspiciousEmailId?: string;
  threadThreatLevel: string;
}
