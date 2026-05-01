import {
  User,
  EmailAnalysis,
  ThreadAnalysis,
  AnalysisHistory,
  ThreatLog,
  AnalyzedUrl,
  FlaggedContent,
  type IThreadAnalysis,
  type IThreatLog,
} from './dbModels.js';
import type { ThreadSecuritySummary, EmailSecurityAnalysis } from './types.js';

/**
 * Database Service - Handles all MongoDB operations for IntelliMail
 */

// ============== USER OPERATIONS ==============

export async function getOrCreateUser(googleId: string, email: string, name?: string, picture?: string) {
  try {
    let user = await User.findOne({ googleId });
    if (!user) {
      user = new User({
        googleId,
        email,
        name,
        picture,
        trustedSenders: [],
      });
      await user.save();
      console.log(`✓ User created: ${email}`);
    }
    return user;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
}

export async function addTrustedSender(userId: string, senderEmail: string) {
  try {
    const user = await User.findById(userId);
    if (user && !user.trustedSenders.includes(senderEmail)) {
      user.trustedSenders.push(senderEmail);
      await user.save();
      console.log(`✓ Added trusted sender: ${senderEmail}`);
    }
    return user;
  } catch (error) {
    console.error('Error in addTrustedSender:', error);
    throw error;
  }
}

export async function getTrustedSenders(userId: string) {
  try {
    const user = await User.findById(userId);
    return user?.trustedSenders || [];
  } catch (error) {
    console.error('Error in getTrustedSenders:', error);
    throw error;
  }
}

// ============== ANALYSIS OPERATIONS ==============

export async function saveThreadAnalysis(
  userId: string,
  threadId: string,
  analysisResult: ThreadSecuritySummary
) {
  try {
    const threadAnalysis = new ThreadAnalysis({
      userId,
      threadId,
      emails: analysisResult.emails,
      overallRisk: analysisResult.overallRisk,
      overallRiskLevel: analysisResult.overallRiskLevel,
      firstSuspiciousEmailIndex: analysisResult.firstSuspiciousEmailIndex,
      firstSuspiciousEmailId: analysisResult.firstSuspiciousEmailId,
      threadThreatLevel: analysisResult.threadThreatLevel,
      trustedDomain: analysisResult.trustedDomain,
      bulkEmailCandidate: analysisResult.bulkEmailCandidate,
      confidenceLabel: analysisResult.confidenceLabel,
      attackType: analysisResult.attackType,
    });
    
    await threadAnalysis.save();
    
    // Also save to history
    await AnalysisHistory.create({
      userId,
      threadId,
      analysisResult: threadAnalysis,
      timestamp: new Date(),
    });
    
    console.log(`✓ Saved analysis for thread: ${threadId}`);
    return threadAnalysis;
  } catch (error) {
    console.error('Error in saveThreadAnalysis:', error);
    throw error;
  }
}

export async function getThreadAnalysis(userId: string, threadId: string) {
  try {
    return await ThreadAnalysis.findOne({ userId, threadId });
  } catch (error) {
    console.error('Error in getThreadAnalysis:', error);
    throw error;
  }
}

export async function getAllAnalyses(userId: string, limit = 50) {
  try {
    return await ThreadAnalysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    console.error('Error in getAllAnalyses:', error);
    throw error;
  }
}

export async function getAnalysisHistory(userId: string, threadId: string) {
  try {
    return await AnalysisHistory.find({ userId, threadId })
      .sort({ timestamp: -1 })
      .limit(10);
  } catch (error) {
    console.error('Error in getAnalysisHistory:', error);
    throw error;
  }
}

// ============== THREAT LOGGING ==============

export async function logThreat(
  userId: string,
  threadId: string,
  emailId: string,
  threatType: string,
  severity: 'Low' | 'Medium' | 'High',
  description: string,
  senderEmail: string
) {
  try {
    const threat = new ThreatLog({
      userId,
      threadId,
      emailId,
      threatType,
      severity,
      description,
      senderEmail,
    });
    await threat.save();
    console.log(`✓ Logged threat: ${threatType} from ${senderEmail}`);
    return threat;
  } catch (error) {
    console.error('Error in logThreat:', error);
    throw error;
  }
}

export async function saveAnalyzedUrl(
  userId: string,
  url: string,
  domain: string,
  isMalicious: boolean,
  threatType?: string,
  confidence?: number
) {
  try {
    const analyzedUrl = new AnalyzedUrl({
      userId,
      url,
      domain,
      isMalicious,
      threatType,
      confidence: confidence || 0,
    });
    await analyzedUrl.save();
    console.log(`✓ Saved URL analysis: ${url} (Malicious: ${isMalicious})`);
    return analyzedUrl;
  } catch (error) {
    console.error('Error in saveAnalyzedUrl:', error);
    throw error;
  }
}

export async function logFlaggedContent(
  userId: string,
  emailId: string,
  contentSnippet: string,
  threatType: string,
  severity: 'Low' | 'Medium' | 'High'
) {
  try {
    const flagged = new FlaggedContent({
      userId,
      emailId,
      contentSnippet,
      threatType,
      severity,
    });
    await flagged.save();
    console.log(`✓ Logged flagged content from email: ${emailId}`);
    return flagged;
  } catch (error) {
    console.error('Error in logFlaggedContent:', error);
    throw error;
  }
}

export async function getThreatsSince(userId: string, hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await ThreatLog.find({
      userId,
      detectedAt: { $gte: since },
    }).sort({ detectedAt: -1 });
  } catch (error) {
    console.error('Error in getThreatsSince:', error);
    throw error;
  }
}

export async function getHighRiskThreats(userId: string) {
  try {
    return await ThreatLog.find({
      userId,
      severity: 'High',
    })
      .sort({ detectedAt: -1 })
      .limit(20);
  } catch (error) {
    console.error('Error in getHighRiskThreats:', error);
    throw error;
  }
}

// ============== ANALYTICS ==============

export async function getAnalyticsData(userId: string) {
  try {
    const totalAnalyses = await ThreadAnalysis.countDocuments({ userId });
    const highRiskThreads = await ThreadAnalysis.countDocuments({
      userId,
      overallRiskLevel: 'High',
    });
    const mediumRiskThreads = await ThreadAnalysis.countDocuments({
      userId,
      overallRiskLevel: 'Medium',
    });
    const recentThreats = await ThreatLog.find({ userId })
      .sort({ detectedAt: -1 })
      .limit(100);

    const threatsByType: Record<string, number> = {};
    recentThreats.forEach((threat) => {
      threatsByType[threat.threatType] = (threatsByType[threat.threatType] || 0) + 1;
    });

    const threatsBySeverity = {
      High: await ThreatLog.countDocuments({ userId, severity: 'High' }),
      Medium: await ThreatLog.countDocuments({ userId, severity: 'Medium' }),
      Low: await ThreatLog.countDocuments({ userId, severity: 'Low' }),
    };

    return {
      totalAnalyses,
      highRiskThreads,
      mediumRiskThreads,
      threatsByType,
      threatsBySeverity,
      recentThreatsCount: recentThreats.length,
    };
  } catch (error) {
    console.error('Error in getAnalyticsData:', error);
    throw error;
  }
}

// ============== CLEANUP ==============

export async function deleteOldAnalyses(userId: string, daysOld = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await ThreadAnalysis.deleteMany({
      userId,
      createdAt: { $lt: cutoffDate },
    });
    console.log(`✓ Deleted ${result.deletedCount} old analyses for user ${userId}`);
    return result;
  } catch (error) {
    console.error('Error in deleteOldAnalyses:', error);
    throw error;
  }
}
