/**
 * Offline .dpbundle verification — browser twin of packages/cli/src/bundle/verify.ts.
 *
 * Pure: no network, no DOM, no React. The Verify routes wire these to UI.
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
  };
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
  for (const required of [
    "created_at",
    "devprofile_version",
    "previous_hash",
    "scores",
    "signals",
  ]) {
    if (!(required in payload)) {
      return { ok: false, reason: `payload missing '${required}'` };
    }
  }
  return { ok: true };
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
  const schema = validateSchema(raw);
  if (!schema.ok) {
    return {
      ok: false,
      checks: {
        schema,
        hash: { ok: false, reason: "skipped (schema failed)" },
        signature: { ok: false, reason: "skipped (schema failed)" },
      },
    };
  }
  const bundle = raw as Bundle;
  const hashCheck = await verifyHash(bundle);
  const sigCheck = hashCheck.ok
    ? await verifySignature(bundle)
    : { ok: false, reason: "skipped (hash failed)" };
  return {
    ok: schema.ok && hashCheck.ok && sigCheck.ok,
    checks: { schema, hash: hashCheck, signature: sigCheck },
  };
}
