import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { analyzeThreadEmails, analyzeMultipleThreads } from './src/lib/securityService.js';
import { connectDB, disconnectDB } from './src/lib/db.js';
import * as dbService from './src/lib/dbService.js';
import type { Thread } from './src/lib/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Connect to MongoDB
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const spamKeywords = ['win', 'lottery', 'free money', 'urgent action required', 'offer expires'];
  const threatKeywords = ['verify your password', 'account suspended', 'click this link', 'wire transfer', 'bitcoin'];

  function classifyCategory(subject: string, body: string): string {
    const text = `${subject} ${body}`.toLowerCase();
    if (spamKeywords.some((word) => text.includes(word))) return 'Spam';
    if (text.includes('invoice') || text.includes('meeting') || text.includes('deadline')) return 'Work';
    if (text.includes('sale') || text.includes('discount') || text.includes('promo')) return 'Promotions';
    return 'Personal';
  }

  function classifySentiment(body: string): string {
    const text = body.toLowerCase();
    if (text.includes('thanks') || text.includes('great') || text.includes('appreciate')) return 'Positive';
    if (text.includes('issue') || text.includes('problem') || text.includes('angry')) return 'Negative';
    return 'Neutral';
  }

  function summarizeThread(emails: Array<{ from?: string; subject?: string; snippet?: string }>): string {
    if (!emails.length) return 'No message content available.';
    const first = emails[0];
    const sender = first.from || 'Unknown sender';
    const subject = first.subject || 'No subject';
    const snippet = first.snippet || 'No snippet available.';
    return `${sender} started "${subject}". Latest context: ${snippet}`;
  }

  // API Routes
  app.post('/api/analyze', async (req, res) => {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Invalid emails data' });
    }

    try {
      const allText = emails
        .map((email: { subject?: string; body?: string; snippet?: string }) => `${email.subject || ''} ${email.body || ''} ${email.snippet || ''}`)
        .join(' ')
        .toLowerCase();

      const threats = threatKeywords.filter((word) => allText.includes(word));
      const category = classifyCategory(emails[0]?.subject || '', allText);
      const sentiment = classifySentiment(allText);
      const priority = threats.length > 0 ? 'High' : category === 'Work' ? 'Medium' : 'Low';
      const summary = summarizeThread(emails);

      res.json({
        category,
        sentiment,
        priority,
        threats,
        summary,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: 'Thread analysis failed' });
    }
  });

  // Gmail Fetch Proxy (Optional if client-side is restricted)
  app.post('/api/gmail/fetch', async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(401).json({ error: 'No access token' });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: 20 });
      const messages = listRes.data.messages || [];
      
      const fullMessages = await Promise.all(messages.map(async (m) => {
        const msg = await gmail.users.messages.get({ userId: 'me', id: m.id! });
        const payload = msg.data.payload;
        const headers = payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers?.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers?.find(h => h.name === 'Date')?.value || '';
        
        // Simple body extraction
        let body = '';
        if (payload?.parts) {
          body = payload.parts[0].body?.data ? Buffer.from(payload.parts[0].body.data, 'base64').toString() : '';
        } else {
          body = payload?.body?.data ? Buffer.from(payload.body.data, 'base64').toString() : '';
        }

        return {
          id: msg.data.id,
          threadId: msg.data.threadId,
          subject,
          from,
          body,
          timestamp: date,
          snippet: msg.data.snippet
        };
      }));

      res.json(fullMessages);
    } catch (error) {
      console.error('Gmail error:', error);
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  });

  // Security Analysis Endpoint - Analyze emails in a thread for threats
  app.post('/api/security/analyze-thread', async (req, res) => {
    const { thread, userId } = req.body;

    // Validate input
    if (!thread || typeof thread !== 'object') {
      return res.status(400).json({ error: 'Invalid thread data' });
    }

    if (!thread.threadId || !Array.isArray(thread.emails)) {
      return res.status(400).json({ 
        error: 'Thread must have threadId and emails array' 
      });
    }

    // Validate emails array
    const requiredEmailFields = ['id', 'threadId', 'subject', 'from', 'body', 'timestamp'];
    const validEmails = thread.emails.every((email: any) =>
      requiredEmailFields.every(field => field in email)
    );

    if (!validEmails) {
      return res.status(400).json({
        error: 'Invalid email format. Required fields: id, threadId, subject, from, body, timestamp'
      });
    }

    try {
      // Analyze the thread
      const analysis = analyzeThreadEmails(thread as Thread);

      // Save to MongoDB if userId provided
      if (userId) {
        try {
          await dbService.saveThreadAnalysis(userId, thread.threadId, analysis);
          
          // Log high-risk threats
          if (analysis.overallRiskLevel === 'High') {
            const firstEmail = thread.emails[0];
            await dbService.logThreat(
              userId,
              thread.threadId,
              firstEmail.id,
              analysis.attackType || 'Unknown',
              'High',
              analysis.emails[0]?.explanation || '',
              firstEmail.from
            );
          }
        } catch (dbError) {
          console.error('Database save error (non-blocking):', dbError);
          // Continue even if DB save fails
        }
      }

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Security analysis error:', error);
      res.status(500).json({ error: 'Thread security analysis failed' });
    }
  });

  // Batch Security Analysis Endpoint - Analyze multiple threads
  app.post('/api/security/analyze-threads', async (req, res) => {
    const { threads, userId } = req.body;

    if (!Array.isArray(threads)) {
      return res.status(400).json({ error: 'Expected threads array' });
    }

    try {
      const analyses = analyzeMultipleThreads(threads as Thread[]);

      // Save all analyses to MongoDB if userId provided
      if (userId) {
        try {
          for (const analysis of analyses) {
            await dbService.saveThreadAnalysis(userId, analysis.threadId, analysis);
          }
        } catch (dbError) {
          console.error('Batch database save error (non-blocking):', dbError);
        }
      }

      res.json({
        success: true,
        data: analyses,
        totalThreads: analyses.length,
        highRiskCount: analyses.filter(a => a.overallRiskLevel === 'High').length,
        mediumRiskCount: analyses.filter(a => a.overallRiskLevel === 'Medium').length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Batch security analysis error:', error);
      res.status(500).json({ error: 'Batch thread analysis failed' });
    }
  });

  // ============== DATABASE API ENDPOINTS ==============

  // Get all analyses for a user
  app.get('/api/analyses/:userId', async (req, res) => {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    try {
      const analyses = await dbService.getAllAnalyses(userId, limit);
      res.json({
        success: true,
        data: analyses,
        count: analyses.length,
      });
    } catch (error) {
      console.error('Error fetching analyses:', error);
      res.status(500).json({ error: 'Failed to fetch analyses' });
    }
  });

  // Get specific thread analysis history
  app.get('/api/analyses/:userId/:threadId', async (req, res) => {
    const { userId, threadId } = req.params;

    try {
      const history = await dbService.getAnalysisHistory(userId, threadId);
      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      res.status(500).json({ error: 'Failed to fetch analysis history' });
    }
  });

  // Get analytics data for a user
  app.get('/api/analytics/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
      const analytics = await dbService.getAnalyticsData(userId);
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Get high-risk threats for a user
  app.get('/api/threats/high-risk/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
      const threats = await dbService.getHighRiskThreats(userId);
      res.json({
        success: true,
        data: threats,
        count: threats.length,
      });
    } catch (error) {
      console.error('Error fetching high-risk threats:', error);
      res.status(500).json({ error: 'Failed to fetch threats' });
    }
  });

  // Get threats detected in last N hours
  app.get('/api/threats/:userId/since/:hours', async (req, res) => {
    const { userId } = req.params;
    const hours = parseInt(req.params.hours as string) || 24;

    try {
      const threats = await dbService.getThreatsSince(userId, hours);
      res.json({
        success: true,
        data: threats,
        count: threats.length,
      });
    } catch (error) {
      console.error('Error fetching recent threats:', error);
      res.status(500).json({ error: 'Failed to fetch threats' });
    }
  });

  // Add trusted sender
  app.post('/api/trusted-senders/:userId', async (req, res) => {
    const { userId } = req.params;
    const { senderEmail } = req.body;

    if (!senderEmail) {
      return res.status(400).json({ error: 'senderEmail is required' });
    }

    try {
      const user = await dbService.addTrustedSender(userId, senderEmail);
      res.json({
        success: true,
        data: user?.trustedSenders || [],
      });
    } catch (error) {
      console.error('Error adding trusted sender:', error);
      res.status(500).json({ error: 'Failed to add trusted sender' });
    }
  });

  // Get trusted senders for a user
  app.get('/api/trusted-senders/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
      const senders = await dbService.getTrustedSenders(userId);
      res.json({
        success: true,
        data: senders,
        count: senders.length,
      });
    } catch (error) {
      console.error('Error fetching trusted senders:', error);
      res.status(500).json({ error: 'Failed to fetch trusted senders' });
    }
  });

  // ============== VITE & STATIC FILES ==============
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n✓ Shutting down gracefully...');
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
