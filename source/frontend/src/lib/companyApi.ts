/**
 * Recruiter-facing JSON client. Currently only the signup endpoint; login
 * (magic-link request + verify) is still server-rendered on the Rails side.
 */
import { apiBase } from "./api";

export interface SignupSuccess {
  ok: true;
  email: string;
  name:  string;
}

export interface SignupValidationError {
  ok: false;
  errors: Record<string, string[]>;
}

export type SignupResult =
  | SignupSuccess
  | (SignupValidationError & { status: 422 })
  | { ok: false; status: number; message: string };

export async function signupCompany(params: { name: string; email: string }): Promise<SignupResult> {
  const r = await fetch(`${apiBase()}/api/v1/companies`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body:    JSON.stringify(params),
  });

  if (r.status === 201) {
    return (await r.json()) as SignupSuccess;
  }

  if (r.status === 422) {
    const body = (await r.json().catch(() => ({}))) as Partial<SignupValidationError>;
    return { ok: false, status: 422, errors: body.errors ?? {} };
  }

  const text = await r.text().catch(() => "");
  return { ok: false, status: r.status, message: text.slice(0, 200) || `HTTP ${r.status}` };
}

// ── Magic-link verification (exchange token for session cookie) ────────────

export interface VerifySuccess {
  ok:          true;
  company:     { id: number; name: string; email: string };
  redirect_to: string;
}
export type VerifyFailureReason = "not_found" | "expired" | "used" | "unknown";
export interface VerifyFailure {
  ok:     false;
  reason: VerifyFailureReason;
  status: number;
}
export type VerifyResult = VerifySuccess | VerifyFailure;

export async function verifyCompanyToken(token: string): Promise<VerifyResult> {
  let r: Response;
  try {
    r = await fetch(`${apiBase()}/api/v1/sessions/company/verify`, {
      method:      "POST",
      credentials: "include", // required so Set-Cookie is honored cross-origin
      headers:     { "Content-Type": "application/json", "Accept": "application/json" },
      body:        JSON.stringify({ token }),
    });
  } catch {
    return { ok: false, reason: "unknown", status: 0 };
  }

  if (r.ok) return (await r.json()) as VerifySuccess;

  const body = (await r.json().catch(() => ({}))) as { reason?: VerifyFailureReason };
  const reason: VerifyFailureReason =
    body.reason === "not_found" || body.reason === "expired" || body.reason === "used"
      ? body.reason
      : "unknown";
  return { ok: false, reason, status: r.status };
}

// ── Request a fresh magic link (for an existing Company) ───────────────────

export type RequestLinkFailureReason = "not_registered" | "missing_email" | "unknown";
export type RequestLinkResult =
  | { ok: true;  email: string }
  | { ok: false; reason: RequestLinkFailureReason; status: number };

export async function requestCompanyLink(email: string): Promise<RequestLinkResult> {
  let r: Response;
  try {
    r = await fetch(`${apiBase()}/api/v1/sessions/company/request`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body:    JSON.stringify({ email }),
    });
  } catch {
    return { ok: false, reason: "unknown", status: 0 };
  }

  if (r.ok) return (await r.json()) as { ok: true; email: string };

  const body = (await r.json().catch(() => ({}))) as { reason?: string };
  const reason: RequestLinkFailureReason =
    body.reason === "not_registered" || body.reason === "missing_email"
      ? body.reason
      : "unknown";
  return { ok: false, reason, status: r.status };
}
