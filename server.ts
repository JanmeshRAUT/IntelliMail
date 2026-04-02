import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini AI Setup
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // API Routes
  app.post('/api/analyze', async (req, res) => {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Invalid emails data' });
    }

    const combinedText = emails.map(e => `Subject: ${e.subject}\nFrom: ${e.from}\nBody: ${e.body}`).join('\n\n---\n\n');

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the following email thread and provide a JSON response.
        Emails:
        ${combinedText}
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: 'Work, Personal, Spam, or Promotions' },
              sentiment: { type: Type.STRING, description: 'Positive, Neutral, or Negative' },
              priority: { type: Type.STRING, description: 'High, Medium, or Low' },
              threats: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of potential threats like phishing or suspicious links' },
              summary: { type: Type.STRING, description: 'A concise summary of the conversation' }
            },
            required: ['category', 'sentiment', 'priority', 'threats', 'summary']
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error('Gemini error:', error);
      res.status(500).json({ error: 'AI analysis failed' });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
