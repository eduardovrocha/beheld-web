/**
 * Platform key registry — fetched from the backend (Phase 5 / F5.6).
 *
 * The browser hits `GET /api/platform-keys` and caches the result for the
 * page session. Offline operation (drag-and-drop /verify with no network)
 * gracefully degrades: attestation verifier reports key_status="unknown"
 * when fetch fails, so the rest of the bundle still verifies.
 */
import { apiBase } from "./api";

export interface PlatformKey {
  key_id: string;
  algorithm: "ed25519";
  public_key: string; // "ed25519-pub:<std-base64>"
  active: boolean;
  revoked: boolean;
  created_at: string;
  rotated_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
}

let cached: ReadonlyArray<PlatformKey> | null = null;
let inflight: Promise<ReadonlyArray<PlatformKey>> | null = null;

export async function fetchPlatformKeys(): Promise<ReadonlyArray<PlatformKey>> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const r = await fetch(`${apiBase()}/api/platform-keys`, {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`platform keys endpoint returned ${r.status}`);
      const body = (await r.json()) as { keys: PlatformKey[] };
      cached = body.keys ?? [];
      return cached;
    } catch (e) {
      // Surface the error to the caller via an empty list — verifier will
      // report key_status="unknown" rather than blocking the whole render.
      cached = [];
      return cached;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Test seam — reset the module-level cache between tests / hot reloads. */
export function resetPlatformKeysCache(): void {
  cached = null;
  inflight = null;
}
