import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import client from 'prom-client';
import os from 'os';
import { analyzeThreadEmailsWithMl, analyzeMultipleThreadsWithMl } from './src/lib/securityService.js';
import type { Thread } from './src/lib/types.js';

console.log('ML_SERVICE_URL:', process.env.ML_SERVICE_URL);
console.log('LSTM_SERVICE_URL:', process.env.LSTM_SERVICE_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  const register = new client.Registry();
  register.setDefaultLabels({ app: 'intellmail' });
  client.collectDefaultMetrics({ register, prefix: 'intellmail_' });

  const httpRequestsTotal = new client.Counter({
    name: 'intellmail_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  const httpRequestDurationSeconds = new client.Histogram({
    name: 'intellmail_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 1, 2.5, 5, 10],
  });

  const httpRequestErrorsTotal = new client.Counter({
    name: 'intellmail_http_request_errors_total',
    help: 'Total number of HTTP error responses',
    labelNames: ['method', 'route', 'status_code'],
  });

  register.registerMetric(httpRequestsTotal);
  register.registerMetric(httpRequestDurationSeconds);
  register.registerMetric(httpRequestErrorsTotal);

  function durationInSeconds(start: [number, number]) {
    const delta = process.hrtime(start);
    return delta[0] + delta[1] / 1e9;
  }

  app.use((req, res, next) => {
    if (req.path === '/metrics') return next();

    const start = process.hrtime();
    res.on('finish', () => {
      const route = req.route?.path || req.path;
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, durationInSeconds(start));
      if (res.statusCode >= 500) {
        httpRequestErrorsTotal.inc(labels);
      }
    });

    next();
  });

  app.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      console.error('Metrics error:', error);
      res.status(500).send('Unable to collect metrics');
    }
  });

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

  app.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });

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
    const { thread } = req.body;

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
      const analysis = await analyzeThreadEmailsWithMl(thread as Thread);

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
    const { threads } = req.body;

    if (!Array.isArray(threads)) {
      return res.status(400).json({ error: 'Expected threads array' });
    }

    try {
      const analyses = await analyzeMultipleThreadsWithMl(threads as Thread[]);

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

  // Vite middleware for development
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

  function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      for (const config of iface) {
        if (config.family === 'IPv4' && !config.internal) {
          return config.address;
        }
      }
    }
  }

  const ip = getLocalIP();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on:`);
    console.log(`Local:   http://localhost:${PORT}`);
    console.log(`Network: http://${ip}:${PORT}`);
  });
}

startServer();
