/**
 * Browser twin of packages/cli/src/bundle/attestation-verify.ts
 * (Phase 5 / F5.6.1.e).
 *
 * Same checks, same orthogonal signals, same Ed25519 verification via
 * Web Crypto API. The platform keys come from the backend
 * `/api/platform-keys` endpoint (cached for the page session by
 * lib/platformKeys.ts).
 */
import { canonicalJson } from "./canonical";
import type { Bundle, BundleAttestation } from "./types";
import type { PlatformKey } from "./platformKeys";

export type AttestationKeyStatus = "active" | "rotated" | "revoked" | "unknown";

export interface AttestationCheck {
  present: boolean;
  payload_valid: boolean;
  signature_valid: boolean;
  key_status?: AttestationKeyStatus;
  revoked_reason?: string | null;
  dev_pubkey_matches?: boolean;
  github?: { user_id: number; login: string };
  platform_key_id?: string;
  reason?: string;
}

const ATTESTATION_TYPE = "beheld-identity-attestation/v1";
const SIG_RE = /^ed25519:([A-Za-z0-9+/=]+)$/;
const PUBKEY_PREFIX_RE = /^ed25519(-pub)?:/;

export async function verifyAttestation(
  bundle: Bundle,
  keys: ReadonlyArray<PlatformKey>,
): Promise<AttestationCheck> {
  if (!bundle.attestation) {
    return { present: false, payload_valid: false, signature_valid: false };
  }

  const att = bundle.attestation;
  const shape = validatePayloadShape(att);
  if (!shape.ok) {
    return {
      present: true,
      payload_valid: false,
      signature_valid: false,
      reason: shape.reason,
    };
  }

  const claimedKeyId = att.payload.platform_key_id;
  const key = keys.find((k) => k.key_id === claimedKeyId);

  if (!key) {
    return {
      present: true,
      payload_valid: true,
      signature_valid: false,
      key_status: "unknown",
      platform_key_id: claimedKeyId,
      github: { user_id: att.payload.github.user_id, login: att.payload.github.login },
      reason: `platform_key_id '${claimedKeyId}' not found in registry`,
    };
  }

  const sigCheck = await verifySignature(key, att);
  const devMatches = compareDevPubkey(att.payload.dev_pubkey, bundle.public_key);

  return {
    present: true,
    payload_valid: true,
    signature_valid: sigCheck.ok,
    key_status: classifyKeyStatus(key),
    revoked_reason: key.revoked_reason,
    dev_pubkey_matches: devMatches,
    github: { user_id: att.payload.github.user_id, login: att.payload.github.login },
    platform_key_id: key.key_id,
    reason: sigCheck.ok ? undefined : sigCheck.reason,
  };
}

function validatePayloadShape(att: BundleAttestation): { ok: boolean; reason?: string } {
  if (typeof att !== "object" || att === null) {
    return { ok: false, reason: "attestation not an object" };
  }
  if (typeof att.signature !== "string" || !SIG_RE.test(att.signature)) {
    return { ok: false, reason: "malformed attestation.signature" };
  }
  if (typeof att.payload !== "object" || att.payload === null) {
    return { ok: false, reason: "missing attestation.payload" };
  }
  if (att.payload.type !== ATTESTATION_TYPE) {
    return { ok: false, reason: `unsupported attestation type: ${att.payload.type}` };
  }
  for (const f of ["platform_key_id", "dev_pubkey", "github", "attested_at"] as const) {
    if (!(f in att.payload)) {
      return { ok: false, reason: `missing attestation.payload.${f}` };
    }
  }
  for (const f of ["user_id", "login", "verified_at"] as const) {
    if (!(f in att.payload.github)) {
      return { ok: false, reason: `missing attestation.payload.github.${f}` };
    }
  }
  return { ok: true };
}

function classifyKeyStatus(key: PlatformKey): AttestationKeyStatus {
  if (key.revoked) return "revoked";
  if (!key.active) return "rotated";
  return "active";
}

async function verifySignature(
  key: PlatformKey,
  att: BundleAttestation,
): Promise<{ ok: boolean; reason?: string }> {
  const sigMatch = att.signature.match(SIG_RE);
  if (!sigMatch) return { ok: false, reason: "malformed signature" };
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64ToBytes(sigMatch[1]!);
  } catch (e) {
    return { ok: false, reason: `cannot decode signature: ${(e as Error).message}` };
  }

  let pubKey: CryptoKey;
  try {
    const pubB64 = key.public_key.replace(PUBKEY_PREFIX_RE, "");
    const pubBytes = base64ToBytes(pubB64);
    pubKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "OKP", crv: "Ed25519", x: bytesToBase64Url(pubBytes) },
      { name: "Ed25519" },
      false,
      ["verify"],
    );
  } catch (e) {
    return { ok: false, reason: `cannot import platform pubkey: ${(e as Error).message}` };
  }

  const canonical = new TextEncoder().encode(canonicalJson(att.payload));
  let ok: boolean;
  try {
    ok = await crypto.subtle.verify(
      { name: "Ed25519" },
      pubKey,
      sigBytes as BufferSource,
      canonical as BufferSource,
    );
  } catch (e) {
    return { ok: false, reason: `verify threw: ${(e as Error).message}` };
  }
  return ok ? { ok: true } : { ok: false, reason: "attestation signature does not match payload" };
}

function compareDevPubkey(attDevPubkey: string, bundlePubkey: string): boolean {
  try {
    const attRaw = base64ToBytes(attDevPubkey.replace(PUBKEY_PREFIX_RE, ""));
    const bundleRaw = base64UrlToBytes(bundlePubkey.replace(PUBKEY_PREFIX_RE, ""));
    if (attRaw.length !== bundleRaw.length) return false;
    for (let i = 0; i < attRaw.length; i++) {
      if (attRaw[i] !== bundleRaw[i]) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const std = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  return base64ToBytes(padded);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
