/**
 * Offline .dpbundle verification — browser twin of packages/cli/src/bundle/verify.ts.
 *
 * Pure: no network, no DOM, no React. The Verify routes wire these to UI.
 *
 * Schema awareness: accepts both v2 bundles (l1 + l2) and v1 bundles (signals).
 * A missing L1 section on a v1 bundle is a warning, not a failure.
 */
import { payloadHash, payloadToCanonical } from "./canonical";
import type { Bundle } from "./types";

export interface CheckResult {
  ok: boolean;
  reason?: string;
}

export interface VerifyResult {
  ok: boolean;
  checks: {
    schema: CheckResult;
    hash: CheckResult;
    signature: CheckResult;
    /** Phase 6 / F6.8 — L1 section presence. `ok=false` here is a warning,
     *  not a failure: bundles generated before Phase 6 are still valid. */
    l1_section: CheckResult & { repo_count?: number };
    /** Phase 6 / F6.8 — L2 section presence. v2 bundles use `l2`; v1 bundles
     *  use the legacy `signals` key. */
    l2_section: CheckResult & { session_count?: number };
  };
  warnings: string[];
}

const HASH_RE = /^sha256:[0-9a-f]{64}$/;
const SIG_RE = /^ed25519:[0-9a-f]{128}$/;
const PUBKEY_RE = /^ed25519:[A-Za-z0-9_-]+$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateSchema(raw: unknown): CheckResult {
  if (!isObject(raw)) return { ok: false, reason: "not a JSON object" };
  if (raw.version === undefined) return { ok: false, reason: "missing 'version'" };
  if (typeof raw.hash !== "string" || !HASH_RE.test(raw.hash))
    return { ok: false, reason: "malformed 'hash'" };
  if (typeof raw.signature !== "string" || !SIG_RE.test(raw.signature))
    return { ok: false, reason: "malformed 'signature'" };
  if (typeof raw.public_key !== "string" || !PUBKEY_RE.test(raw.public_key))
    return { ok: false, reason: "malformed 'public_key'" };
  if (!isObject(raw.payload)) return { ok: false, reason: "missing or invalid 'payload'" };
  const payload = raw.payload as Record<string, unknown>;
  for (const required of ["created_at", "beheld_version", "previous_hash", "scores"]) {
    if (!(required in payload)) {
      return { ok: false, reason: `payload missing '${required}'` };
    }
  }
  // v2 → l1 + l2; v1 → signals. Accept either to keep old bundles verifiable.
  const hasV2 = "l1" in payload && "l2" in payload;
  const hasV1 = "signals" in payload;
  if (!hasV2 && !hasV1) {
    return { ok: false, reason: "payload missing both 'l2' (v2) and 'signals' (v1)" };
  }
  return { ok: true };
}

interface PayloadView {
  l1?: { total_repos?: number };
  l2?: { sessions_analyzed?: number };
  signals?: { sessions_analyzed?: number };
}

function validateL1Section(payload: PayloadView): VerifyResult["checks"]["l1_section"] {
  if (!payload.l1 || typeof payload.l1 !== "object") {
    return {
      ok: false,
      reason: "Seção L1 ausente — bundle gerado com versão anterior do DevProfile",
    };
  }
  const count = typeof payload.l1.total_repos === "number" ? payload.l1.total_repos : 0;
  return { ok: true, repo_count: count };
}

function validateL2Section(payload: PayloadView): VerifyResult["checks"]["l2_section"] {
  const l2 = payload.l2 ?? payload.signals;
  if (!l2 || typeof l2 !== "object") {
    return { ok: false, reason: "L2 section missing (no 'l2' key, no legacy 'signals')" };
  }
  const count = typeof l2.sessions_analyzed === "number" ? l2.sessions_analyzed : 0;
  return { ok: true, session_count: count };
}

async function verifyHash(bundle: Bundle): Promise<CheckResult> {
  const recomputed = await payloadHash(bundle.payload);
  if (recomputed === bundle.hash) return { ok: true };
  return {
    ok: false,
    reason: `expected ${recomputed.slice(0, 24)}…, got ${bundle.hash.slice(0, 24)}…`,
  };
}

async function verifySignature(bundle: Bundle): Promise<CheckResult> {
  const x = bundle.public_key.replace(/^ed25519:/, "");
  let pubKey: CryptoKey;
  try {
    pubKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "OKP", crv: "Ed25519", x },
      { name: "Ed25519" },
      false,
      ["verify"],
    );
  } catch (e) {
    return { ok: false, reason: `cannot import public_key: ${(e as Error).message}` };
  }

  const sigHex = bundle.signature.replace(/^ed25519:/, "");
  const sigMatches = sigHex.match(/.{2}/g);
  if (!sigMatches) return { ok: false, reason: "signature not valid hex" };
  const sigBytes = Uint8Array.from(sigMatches.map((b) => parseInt(b, 16)));

  const canonical = new TextEncoder().encode(payloadToCanonical(bundle.payload));

  try {
    const ok = await crypto.subtle.verify({ name: "Ed25519" }, pubKey, sigBytes, canonical);
    return ok ? { ok: true } : { ok: false, reason: "signature does not match payload" };
  } catch (e) {
    return { ok: false, reason: `verify threw: ${(e as Error).message}` };
  }
}

export async function verifyBundle(raw: unknown): Promise<VerifyResult> {
  const skipped: CheckResult = { ok: false, reason: "skipped (schema failed)" };
  const schema = validateSchema(raw);
  if (!schema.ok) {
    return {
      ok: false,
      warnings: [],
      checks: {
        schema,
        hash: skipped,
        signature: skipped,
        l1_section: { ...skipped },
        l2_section: { ...skipped },
      },
    };
  }
  const bundle = raw as Bundle;
  const hashCheck = await verifyHash(bundle);
  const sigCheck = hashCheck.ok
    ? await verifySignature(bundle)
    : { ok: false, reason: "skipped (hash failed)" };

  const payloadView = bundle.payload as unknown as PayloadView;
  const l1Check = validateL1Section(payloadView);
  const l2Check = validateL2Section(payloadView);

  const warnings: string[] = [];
  if (!l1Check.ok && l1Check.reason) warnings.push(l1Check.reason);

  // L1 absence is a warning, not a failure — old bundles still pass.
  return {
    ok: schema.ok && hashCheck.ok && sigCheck.ok && l2Check.ok,
    warnings,
    checks: { schema, hash: hashCheck, signature: sigCheck, l1_section: l1Check, l2_section: l2Check },
  };
}
