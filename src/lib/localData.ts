export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
}

export interface ThreadAnalysis {
  category: string;
  sentiment: string;
  priority: string;
  threats: string[];
  summary: string;
}

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  body: string;
  timestamp: string;
  snippet: string;
}

export interface Thread {
  id: string;
  subject: string;
  lastMessageTimestamp: string;
  analysis?: ThreadAnalysis;
}

export interface Alert {
  id: string;
  type: 'Threat' | 'Urgent';
  message: string;
  threadId: string;
  timestamp: string;
}

const USER_KEY = 'intellimail_user';
const ACCESS_TOKEN_KEY = 'gmail_access_token';
const ACCESS_TOKEN_EXPIRY_KEY = 'gmail_access_token_expiry';
const THREADS_KEY = 'intellimail_threads';
const EMAILS_KEY = 'intellimail_emails';
const ALERTS_KEY = 'intellimail_alerts';

function parseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function notifyDataUpdated() {
  window.dispatchEvent(new Event('intellimail:data-updated'));
}

export function getUser(): AppUser | null {
  return parseJSON<AppUser | null>(localStorage.getItem(USER_KEY), null);
}

export function setUser(user: AppUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string, expiresInSeconds?: number) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (expiresInSeconds && Number.isFinite(expiresInSeconds)) {
    const expiryMs = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, String(expiryMs));
  }
}

export function isAccessTokenExpired(): boolean {
  const expiryRaw = localStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
  if (!expiryRaw) return false;
  const expiryMs = Number(expiryRaw);
  if (!Number.isFinite(expiryMs)) return false;
  return Date.now() >= expiryMs - 60_000;
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
}

export function getThreads(): Thread[] {
  return parseJSON<Thread[]>(localStorage.getItem(THREADS_KEY), []);
}

export function setThreads(threads: Thread[]) {
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  notifyDataUpdated();
}

export function getEmails(): Email[] {
  return parseJSON<Email[]>(localStorage.getItem(EMAILS_KEY), []);
}

export function setEmails(emails: Email[]) {
  localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
  notifyDataUpdated();
}

export function getAlerts(): Alert[] {
  return parseJSON<Alert[]>(localStorage.getItem(ALERTS_KEY), []);
}

export function setAlerts(alerts: Alert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  notifyDataUpdated();
}

export function upsertThreads(nextThreads: Thread[]) {
  const current = getThreads();
  const byId = new Map<string, Thread>(current.map((thread) => [thread.id, thread]));
  nextThreads.forEach((thread) => byId.set(thread.id, thread));
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
  );
  setThreads(merged);
}

export function upsertEmails(nextEmails: Email[]) {
  const current = getEmails();
  const byId = new Map<string, Email>(current.map((email) => [email.id, email]));
  nextEmails.forEach((email) => byId.set(email.id, email));
  setEmails(Array.from(byId.values()));
}

export function pushAlerts(nextAlerts: Alert[]) {
  const current = getAlerts();
  const merged = [...nextAlerts, ...current]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 25);
  setAlerts(merged);
}