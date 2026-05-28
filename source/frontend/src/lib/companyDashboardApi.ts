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
  account_id:   number;
  dev_handle:   string;
  bundle_slug:  string | null;
  job_title:    string | null;
  body_excerpt: string;
  status:       "pending" | "responded" | "ignored";
  sent_at:      string;
  responded_at: string | null;
  reply_body:   string | null;   // resposta curta do dev (F_REPLY)
}

export interface SavedDev {
  account_id:    number;
  dev_handle:    string;
  bundle_slug:   string | null;
  bundle_status: "verified" | "outdated" | "revoked" | null;
  note:          string | null;
  saved_at:      string;
}

export type PositionSectionKey =
  | "responsibilities"
  | "technical_stack"
  | "requirements"
  | "qualifications"
  | "nice_to_have";

export type PositionSections = Partial<Record<PositionSectionKey, string>>;

// PF.1 — location is a jsonb hierarchy. The structured picker fills
// region/country/state/city; rows migrated from the old free-text column
// carry only `raw`; an empty object means "no location".
export interface PositionLocation {
  region?:  string;
  country?: string;
  state?:   string;
  city?:    string;
  raw?:     string;
}

export type PositionSignal = "ecosystems" | "test_ratio" | "recency";
export type PositionStatus = "active" | "expired" | "closed";

// Threshold value is shaped per signal — array for ecosystems, number
// for the others. The wire format wraps either in a small object so the
// jsonb storage doesn't have to deal with bare scalars.
export type PositionThresholdValue =
  | { items: string[] }
  | { number: number };

export interface PositionThreshold {
  signal:   PositionSignal;
  operator: "includes" | "gte" | "lte";
  value:    PositionThresholdValue;
}

export interface PositionPriority {
  signal:  PositionSignal;
  ranking: 1 | 2 | 3 | 4;
  weight:  number;       // derived server-side from ranking
}

export interface Position {
  id:           number;
  title:        string;
  description:  string | null;
  location:     PositionLocation;
  technologies: string[];
  sections:     PositionSections;
  status:       PositionStatus;
  activated_at: string | null;
  expires_at:   string | null;
  thresholds:   PositionThreshold[];
  priorities:   PositionPriority[];
  archived:     boolean;
  archived_at:  string | null;
  created_at:   string;
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

// ── positions (vagas) ─────────────────────────────────────────────────────

export function getPositions(): Promise<Position[]> {
  return call<Position[]>("/positions");
}

export interface PositionInput {
  title:         string;
  description?:  string;
  location?:     PositionLocation;
  technologies?: string[];
  sections?:     PositionSections;
  thresholds?:   PositionThreshold[];
  priorities?:   Array<{ signal: PositionSignal }>;   // order in array → ranking 1..N
}

export function createPosition(input: PositionInput) {
  return call<{ ok: true; position: Position }>("/positions", {
    method: "POST",
    body:   JSON.stringify(input),
  });
}

export function updatePosition(id: number, input: Partial<PositionInput>) {
  return call<{ ok: true; position: Position }>(`/positions/${id}`, {
    method: "PATCH",
    body:   JSON.stringify(input),
  });
}

// Soft archive — the backend flips archived_at instead of hard-deleting so
// historical Message rows that referenced the vacancy stay coherent.
export function archivePosition(id: number) {
  return call<{ ok: true; position: Position }>(`/positions/${id}`, { method: "DELETE" });
}

// Permanent delete — only valid once a vaga is archived (backend enforces).
export function purgePosition(id: number) {
  return call<{ ok: true; id: number }>(`/positions/${id}/purge`, { method: "DELETE" });
}

// ── match results (P17) ─────────────────────────────────────────────────

// Detail block surfaced for near-miss rows. Shape varies per failed_signal:
//   - test_ratio / recency  → { current, threshold }       (both numeric)
//   - ecosystems            → { missing_items: string[] }  (binary)
export interface PositionFailedDetail {
  current?:        number;
  threshold?:      number;
  missing_items?: string[];
}

// Evolution curve (P19) — currently only computed for `test_ratio`.
export type PositionCurveStatus = "available" | "building" | "none" | "not_applicable";

export interface PositionCurve {
  status:       PositionCurveStatus;
  current?:     number;
  delta?:       number;
  trend?:       "up" | "down" | "stable";
  points?:      number;
  period_days?: number;
}

export interface PositionMatchRow {
  account_id:    number;
  dev_handle:    string;
  bundle_slug:   string | null;
  score:         number;          // integer 0..100 (rounded for the UI)
  score_decimal: number;          // raw decimal preserved for re-ranking
  match_type:    "match" | "near_miss";
  failed_signal: PositionSignal | null;
  failed_detail?: PositionFailedDetail;
  curve?:         PositionCurve;
  calculated_at: string;
}

export interface PositionMatchesPayload {
  calculated_at: string | null;
  matches:       PositionMatchRow[];
  near_miss:     PositionMatchRow[];
}

export function getPositionMatches(id: number): Promise<PositionMatchesPayload> {
  return call<PositionMatchesPayload>(`/positions/${id}/matches`);
}

export function recalculatePositionMatches(id: number) {
  return call<PositionMatchesPayload & { ok: true }>(`/positions/${id}/matches/recalculate`, {
    method: "POST",
  });
}

// P20.3 — reset the 30-day clock + re-run matcher. Returns the fresh Position.
export function reactivatePosition(id: number) {
  return call<{ ok: true; position: Position }>(`/positions/${id}/reactivate`, {
    method: "POST",
  });
}
