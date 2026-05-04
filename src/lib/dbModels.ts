import mongoose, { Schema, Document } from 'mongoose';
import type { EmailSecurityAnalysis, ThreadSecuritySummary, LinkSecurityAnalysis } from './types.js';

// User schema for storing user information and preferences
interface IUser extends Document {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  trustedSenders: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  googleId: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  name: String,
  picture: String,
  trustedSenders: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Email analysis schema for storing individual email threat analysis
interface IEmailAnalysis extends EmailSecurityAnalysis, Document {
  userId: string;
  threadId: string;
  createdAt: Date;
}

const emailAnalysisSchema = new Schema<IEmailAnalysis>({
  userId: { type: String, required: true, index: true },
  threadId: { type: String, required: true, index: true },
  emailId: { type: String, required: true },
  sender: { type: String, required: true },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  threats: [String],
  links: [String],
  linkAnalysis: [{
    url: String,
    domain: String,
    trustedDomain: Boolean,
    suspiciousTld: Boolean,
    domainMismatch: Boolean,
    phishingDetected: Boolean,
    confidence: Number,
    reason: String,
  }],
  newSender: Boolean,
  toneChanged: Boolean,
  explanation: String,
  suspiciousIndex: Number,
  trustedDomain: Boolean,
  bulkEmailCandidate: Boolean,
  confidenceLabel: String,
  attackType: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

// Thread analysis schema for storing overall thread threat summary
interface IThreadAnalysis extends ThreadSecuritySummary, Document {
  userId: string;
  emails: IEmailAnalysis[];
  createdAt: Date;
  updatedAt: Date;
}

const threadAnalysisSchema = new Schema<IThreadAnalysis>({
  userId: { type: String, required: true, index: true },
  threadId: { type: String, required: true, index: true },
  emails: [emailAnalysisSchema],
  overallRisk: { type: Number, required: true },
  overallRiskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  firstSuspiciousEmailIndex: Number,
  firstSuspiciousEmailId: String,
  threadThreatLevel: String,
  trustedDomain: Boolean,
  bulkEmailCandidate: Boolean,
  confidenceLabel: String,
  attackType: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Analysis history schema for tracking all past analyses
interface IAnalysisHistory extends Document {
  userId: string;
  threadId: string;
  analysisResult: IThreadAnalysis;
  timestamp: Date;
}

const analysisHistorySchema = new Schema<IAnalysisHistory>({
  userId: { type: String, required: true, index: true },
  threadId: { type: String, required: true, index: true },
  analysisResult: threadAnalysisSchema,
  timestamp: { type: Date, default: Date.now, index: true },
});

// Threat log schema for tracking detected threats
interface IThreatLog extends Document {
  userId: string;
  threadId: string;
  emailId: string;
  threatType: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  senderEmail: string;
  detectedAt: Date;
}

const threatLogSchema = new Schema<IThreatLog>({
  userId: { type: String, required: true, index: true },
  threadId: { type: String, required: true },
  emailId: { type: String, required: true },
  threatType: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  description: String,
  senderEmail: String,
  detectedAt: { type: Date, default: Date.now, index: true },
});

// Analyzed URL schema for tracking every URL scanned
interface IAnalyzedUrl extends Document {
  userId: string;
  url: string;
  domain: string;
  isMalicious: boolean;
  threatType?: string;
  confidence: number;
  detectedAt: Date;
}

const analyzedUrlSchema = new Schema<IAnalyzedUrl>({
  userId: { type: String, required: true, index: true },
  url: { type: String, required: true, index: true },
  domain: String,
  isMalicious: { type: Boolean, default: false },
  threatType: String,
  confidence: { type: Number, default: 0 },
  detectedAt: { type: Date, default: Date.now, index: true },
});

// Flagged content schema for tracking specific snippets that triggered alerts
interface IFlaggedContent extends Document {
  userId: string;
  emailId: string;
  contentSnippet: string;
  threatType: string;
  severity: string;
  detectedAt: Date;
}

const flaggedContentSchema = new Schema<IFlaggedContent>({
  userId: { type: String, required: true, index: true },
  emailId: { type: String, required: true, index: true },
  contentSnippet: { type: String, required: true },
  threatType: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  detectedAt: { type: Date, default: Date.now, index: true },
});

// Create models
export const User = mongoose.model<IUser>('User', userSchema);
export const EmailAnalysis = mongoose.model<IEmailAnalysis>('EmailAnalysis', emailAnalysisSchema);
export const ThreadAnalysis = mongoose.model<IThreadAnalysis>('ThreadAnalysis', threadAnalysisSchema);
export const AnalysisHistory = mongoose.model<IAnalysisHistory>('AnalysisHistory', analysisHistorySchema);
export const ThreatLog = mongoose.model<IThreatLog>('ThreatLog', threatLogSchema);
export const AnalyzedUrl = mongoose.model<IAnalyzedUrl>('AnalyzedUrl', analyzedUrlSchema);
export const FlaggedContent = mongoose.model<IFlaggedContent>('FlaggedContent', flaggedContentSchema);

// Export types for use in other files
export type { IUser, IEmailAnalysis, IThreadAnalysis, IAnalysisHistory, IThreatLog };
