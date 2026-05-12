// Direct Gmail API client for frontend (Vercel deployment)
// No backend required - uses access token directly

import axios from 'axios';

export interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  body: string;
  snippet: string;
  timestamp: string;
}

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1/users/me';

/**
 * Decode base64 string in browser
 */
function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(atob(str).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    console.warn('Failed to decode base64:', e);
    return str;
  }
}

/**
 * Fetch emails directly from Gmail API using access token
 * No backend required!
 */
export async function fetchGmailEmails(accessToken: string, maxResults: number = 20): Promise<GmailEmail[]> {
  try {
    // Step 1: List message IDs
    const listResponse = await axios.get(`${GMAIL_API_BASE}/messages`, {
      params: {
        maxResults,
        q: 'in:inbox', // Only fetch inbox emails
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const messageIds = listResponse.data.messages || [];
    if (messageIds.length === 0) {
      return [];
    }

    // Step 2: Fetch full message details
    const emails: GmailEmail[] = await Promise.all(
      messageIds.map(async (msg: any) => {
        try {
          const msgResponse = await axios.get(`${GMAIL_API_BASE}/messages/${msg.id}`, {
            params: {
              format: 'full',
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const payload = msgResponse.data.payload || {};
          const headers = payload.headers || [];

          // Extract headers
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name === name)?.value || '';

          const subject = getHeader('Subject');
          const from = getHeader('From');
          const date = getHeader('Date');

          // Extract body - handle both multipart and simple messages
          let body = '';
          if (payload.parts) {
            // Multipart message - look for text/plain part
            const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
              body = decodeBase64(textPart.body.data);
            } else if (payload.parts[0]?.body?.data) {
              // Fallback to first part
              body = decodeBase64(payload.parts[0].body.data);
            }
          } else if (payload.body?.data) {
            // Simple message
            body = decodeBase64(payload.body.data);
          }

          return {
            id: msgResponse.data.id,
            threadId: msgResponse.data.threadId,
            subject,
            from,
            body: body.substring(0, 1000), // Limit body size
            snippet: msgResponse.data.snippet || '',
            timestamp: date || new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Failed to fetch message ${msg.id}:`, error);
          return null;
        }
      })
    );

    return emails.filter((e): e is GmailEmail => e !== null);
  } catch (error: any) {
    console.error('Gmail API error:', error.response?.data || error.message);
    throw new Error(`Failed to fetch emails from Gmail: ${error.message}`);
  }
}

/**
 * Analyze emails using Hugging Face directly
 */
export async function analyzeEmailsWithHF(
  emails: GmailEmail[],
  hfApiKey: string,
  mlServiceUrl: string = 'https://JerryJR1705-intellmail.hf.space'
): Promise<any> {
  try {
    const text = emails
      .map((e) => `Subject: ${e.subject}\n\nFrom: ${e.from}\n\nBody: ${e.body}`)
      .join('\n\n---\n\n');

    const response = await axios.post(`${mlServiceUrl}/predict-email`, 
      { text },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hfApiKey}`,
        },
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('HF Analysis error:', error.response?.data || error.message);
    // Return default analysis on error
    return {
      threats: [],
      priority: 'Low',
      riskScore: 0,
      summary: 'Unable to analyze at this moment',
    };
  }
}
