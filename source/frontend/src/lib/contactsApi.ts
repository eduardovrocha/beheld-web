/**
 * Recruiter → dev contact API client. All requests carry the signed
 * `_beheld_company_session` cookie via `credentials: include`. 401 surfaces
 * as ContactAuthError so the SPA can redirect to the login form; 404 means
 * the dev opted out or has no active bundle.
 */
import { apiBase } from "./api";

export class ContactAuthError extends Error {
  constructor() { super("Sessão expirada — faça login para continuar."); }
}
export class ContactUnavailableError extends Error {
  constructor() { super("Perfil indisponível."); }
}

export interface ContactTarget {
  ok:      true;
  account: { id: number; handle: string };
}

export interface ContactSendError {
  ok:      false;
  error:   "missing_content";
  message: string;
}

export async function loadContactTarget(accountId: string | number): Promise<ContactTarget> {
  const r = await fetch(`${apiBase()}/api/v1/accounts/${encodeURIComponent(String(accountId))}/contact`, {
    credentials: "include",
    headers:     { "Accept": "application/json" },
  });
  if (r.status === 401) throw new ContactAuthError();
  if (r.status === 404) throw new ContactUnavailableError();
  if (!r.ok) throw new Error(`API ${r.status}`);
  return (await r.json()) as ContactTarget;
}

export async function sendContact(
  accountId: string | number,
  params: { job_title?: string; body: string },
): Promise<{ ok: true; message_id: number } | ContactSendError> {
  const r = await fetch(`${apiBase()}/api/v1/accounts/${encodeURIComponent(String(accountId))}/contact`, {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json", "Accept": "application/json" },
    body:        JSON.stringify(params),
  });
  if (r.status === 401) throw new ContactAuthError();
  if (r.status === 404) throw new ContactUnavailableError();

  if (r.status === 201) return (await r.json()) as { ok: true; message_id: number };
  if (r.status === 422) return (await r.json()) as ContactSendError;
  throw new Error(`API ${r.status}`);
}
