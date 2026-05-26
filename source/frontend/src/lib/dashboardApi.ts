/**
 * Dashboard JSON API client. Wraps fetch with a Bearer token the SPA
 * receives from `?session=<token>` (set by `beheld auth` → portal). The
 * token is held in sessionStorage so navigations stay authenticated; we
 * deliberately avoid localStorage so a session doesn't outlive the tab.
 */
import { apiBase } from "./api";

const TOKEN_KEY = "beheld:dashboard_token";

export function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode / disabled storage — caller falls back to in-memory */
  }
}

export function clearSessionToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

// ── shapes (mirror Api::V1::DashboardController#dashboard_payload) ──────────

export interface DashboardAccount {
  id: string;
  fingerprint: string;
  handle: string;
  email_recovery:       string | null;
  email_contact:        string | null;
  phone_contact:        string | null;
  directory:            boolean;
  watch:                boolean;
  notification_email:   string | null;
  notification_webhook: string | null;
  contact_configured:   boolean;
}

export interface DashboardBundle {
  id: string;
  url_slug: string;
  published_at:   string;
  last_bundle_at: string;
  status:  "verified" | "outdated" | "revoked";
  visible: boolean;
  verifications_count: number;
}

export interface DashboardNotification {
  id:          string;
  company:     string | null;
  job_title:   string | null;
  area:        string | null;
  verified_at: string;
}

export interface DashboardMessage {
  id:           string;
  company:      string;
  job_title:    string | null;
  body:         string;
  sent_at:      string;
  responded_at: string | null;
  ignored_at:   string | null;
  state:        "pending" | "responded" | "ignored";
}

export interface DashboardPayload {
  account:       DashboardAccount;
  bundles:       DashboardBundle[];
  notifications: DashboardNotification[];
  messages:      DashboardMessage[];
}

export class DashboardAuthError extends Error {
  constructor() { super("Sessão expirada ou inválida. Faça login novamente."); }
}

async function call(path: string, init: RequestInit = {}): Promise<DashboardPayload> {
  const token = getSessionToken();
  if (!token) throw new DashboardAuthError();

  const r = await fetch(`${apiBase()}/api/v1${path}`, {
    ...init,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (r.status === 401) {
    clearSessionToken();
    throw new DashboardAuthError();
  }
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`API ${r.status}: ${text.slice(0, 200)}`);
  }
  return (await r.json()) as DashboardPayload;
}

export function getDashboard(): Promise<DashboardPayload> {
  return call("/dashboard");
}

export function updateSettings(patch: Partial<DashboardAccount>): Promise<DashboardPayload> {
  return call("/dashboard/settings", { method: "PATCH", body: JSON.stringify(patch) });
}

export function revokeBundle(id: string): Promise<DashboardPayload> {
  return call(`/dashboard/bundles/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function toggleBundle(id: string): Promise<DashboardPayload> {
  return call(`/dashboard/bundles/${encodeURIComponent(id)}/toggle`, { method: "PATCH" });
}

export function respondMessage(id: string): Promise<DashboardPayload> {
  return call(`/dashboard/messages/${encodeURIComponent(id)}/respond`, { method: "POST" });
}

export function ignoreMessage(id: string): Promise<DashboardPayload> {
  return call(`/dashboard/messages/${encodeURIComponent(id)}/ignore`, { method: "POST" });
}
