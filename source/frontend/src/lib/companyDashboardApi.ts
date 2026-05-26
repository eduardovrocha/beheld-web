/**
 * Recruiter dashboard API client. All calls travel with the signed
 * `_beheld_company_session` cookie via `credentials: include`. 401 surfaces
 * as CompanyAuthError so the SPA can redirect to /companies/new.
 */
import { apiBase } from "./api";

export class CompanyAuthError extends Error {
  constructor() { super("Sessão expirada — faça login para continuar."); }
}

// ── shapes (mirror Api::V1::Company::* JSON responses) ─────────────────────

export interface DashboardStats {
  verifications_total: number;
  messages_total:      number;
  messages_responded:  number;
  response_rate:       number | null;
  saved_devs_total:    number;
}

export interface ActivityEvent {
  type:        "verification" | "message";
  dev_handle:  string | null;
  bundle_slug: string | null;
  job_title:   string | null;
  status?:     "pending" | "responded" | "ignored";
  at:          string;
}

export interface DashboardPayload {
  stats:           DashboardStats;
  recent_activity: ActivityEvent[];
}

export interface CompanyMessage {
  id:           number;
  dev_handle:   string;
  bundle_slug:  string | null;
  job_title:    string | null;
  body_excerpt: string;
  status:       "pending" | "responded" | "ignored";
  sent_at:      string;
  responded_at: string | null;
}

export interface SavedDev {
  account_id:    number;
  dev_handle:    string;
  bundle_slug:   string | null;
  bundle_status: "verified" | "outdated" | "revoked" | null;
  note:          string | null;
  saved_at:      string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${apiBase()}/api/v1/company${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (r.status === 401) throw new CompanyAuthError();
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`API ${r.status}: ${text.slice(0, 200)}`);
  }
  return (await r.json()) as T;
}

export function getDashboard(): Promise<DashboardPayload> {
  return call<DashboardPayload>("/dashboard");
}

export function getMessages(): Promise<CompanyMessage[]> {
  return call<CompanyMessage[]>("/messages");
}

export function getSavedDevs(): Promise<SavedDev[]> {
  return call<SavedDev[]>("/saved_devs");
}

export function saveDev(accountId: number, note: string | null = null) {
  return call<{ ok: true; saved_dev: SavedDev }>("/saved_devs", {
    method: "POST",
    body:   JSON.stringify({ account_id: accountId, note }),
  });
}

export function updateSavedDevNote(accountId: number, note: string) {
  return call<{ ok: true; saved_dev: SavedDev }>(`/saved_devs/${accountId}`, {
    method: "PATCH",
    body:   JSON.stringify({ note }),
  });
}

export function removeSavedDev(accountId: number) {
  return call<{ ok: true }>(`/saved_devs/${accountId}`, { method: "DELETE" });
}
