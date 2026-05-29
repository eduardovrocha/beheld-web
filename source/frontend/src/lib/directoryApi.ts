/**
 * Recruiter directory client. Auth is by the signed `_beheld_company_session`
 * cookie set by `POST /api/v1/sessions/company/verify`. We just include
 * credentials and the browser handles it.
 */
import { apiBase } from "./api";
import { translate } from "@/i18n/dict";

export interface DevSummary {
  account_id:     number;
  handle:         string;
  slug:           string | null;
  ecosystems:     string[];
  platforms:      string[];
  test_ratio:     number | null;
  last_bundle_at: string | null;
  status:         "verified" | "outdated" | "revoked" | null;
}

export interface DirectoryFilters {
  ecosystems:     string[];
  test_ratio_min: string;
  test_ratio_max: string;
  status:         "all" | "verified" | "outdated";
}

export interface DirectoryPayload {
  ok:                    true;
  company:               { id: number; name: string };
  available_ecosystems:  string[];
  filters:               DirectoryFilters;
  results:               DevSummary[];
}

export class DirectoryAuthError extends Error {
  constructor() { super(translate("errors.session_expired")); }
}

export interface DirectoryQuery {
  ecosystems?:     string[];
  test_ratio_min?: string;
  test_ratio_max?: string;
  status?:         string;
}

function buildQuery(q: DirectoryQuery): string {
  const sp = new URLSearchParams();
  (q.ecosystems ?? []).forEach((e) => sp.append("ecosystems[]", e));
  if (q.test_ratio_min) sp.append("test_ratio_min", q.test_ratio_min);
  if (q.test_ratio_max) sp.append("test_ratio_max", q.test_ratio_max);
  if (q.status && q.status !== "all") sp.append("status", q.status);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function getDirectory(query: DirectoryQuery = {}): Promise<DirectoryPayload> {
  const r = await fetch(`${apiBase()}/api/v1/directory${buildQuery(query)}`, {
    credentials: "include",
    headers:     { "Accept": "application/json" },
  });

  if (r.status === 401) throw new DirectoryAuthError();

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`API ${r.status}: ${text.slice(0, 200)}`);
  }

  return (await r.json()) as DirectoryPayload;
}
