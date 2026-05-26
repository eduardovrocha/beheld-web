import type { Bundle } from "./types";

const DEFAULT_API_URL = "http://localhost:3000";

export function apiBase(): string {
  // Vite picks up VITE_API_URL at build time; falls back at runtime to default.
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  return (fromEnv ?? DEFAULT_API_URL).replace(/\/+$/, "");
}

export async function fetchBundle(id: string): Promise<Bundle> {
  const r = await fetch(`${apiBase()}/v/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });
  if (r.status === 404) {
    throw new Error("Bundle não encontrado ou expirado.");
  }
  if (!r.ok) {
    throw new Error(`Engine respondeu ${r.status}.`);
  }
  return (await r.json()) as Bundle;
}

/**
 * Same fetch as `fetchBundle` but also surfaces the portal-side account id
 * (when present). The id rides in the `X-Beheld-Account-Id` response
 * header so the wire-format Bundle struct stays unchanged for offline
 * verifiers. Used by the SPA to wire features like "Save dev" that need a
 * stable Account reference.
 */
export async function fetchBundleWithAccount(id: string): Promise<{ bundle: Bundle; accountId: number | null }> {
  const r = await fetch(`${apiBase()}/v/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });
  if (r.status === 404) throw new Error("Bundle não encontrado ou expirado.");
  if (!r.ok)            throw new Error(`Engine respondeu ${r.status}.`);

  const bundle = (await r.json()) as Bundle;
  const idHeader = r.headers.get("X-Beheld-Account-Id");
  const accountId = idHeader ? Number(idHeader) : null;
  return { bundle, accountId: Number.isFinite(accountId) ? accountId : null };
}

export function badgeUrl(id: string): string {
  return `${apiBase()}/v/${encodeURIComponent(id)}/badge.svg`;
}
