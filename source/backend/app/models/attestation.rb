# Identity attestation (Phase 5 / F5.6.1).
#
# Each row binds a developer's Ed25519 public key to a GitHub identity,
# signed by the DevProfile platform key. The signed payload bytes are
# preserved verbatim in `signed_payload_json` so that verifiers can
# re-derive signature verification without re-canonicalizing.
#
# Revocation status is NOT stored on the row — it cascades from the
# signing platform key's own `revoked` flag (see PlatformKey). This keeps
# a single source of truth and makes mass-revocation an info.json edit
# instead of a DB migration.

class Attestation < ApplicationRecord
  ATTESTATION_TYPE = "beheld-identity-attestation/v1".freeze

  validates :dev_pubkey_b64,         presence: true
  validates :dev_pubkey_fingerprint, presence: true
  validates :github_user_id,         presence: true
  validates :github_login,           presence: true
  validates :platform_key_id,        presence: true
  validates :signed_payload_json,    presence: true
  validates :signature_b64,          presence: true
  validates :attested_at,            presence: true

  # Builds the payload hash that will be canonicalized + signed. The
  # `verified_at` and `attested_at` ISO timestamps are deliberately the
  # same instant — the OAuth-derived GitHub identity is fresh as of the
  # signing moment.
  def self.build_payload(dev_pubkey_b64:, github_user_id:, github_login:, platform_key_id:, attested_at:)
    iso = attested_at.utc.iso8601
    {
      "type"            => ATTESTATION_TYPE,
      "platform_key_id" => platform_key_id,
      "dev_pubkey"      => "ed25519-pub:#{dev_pubkey_b64}",
      "github"          => {
        "user_id"     => github_user_id,
        "login"       => github_login,
        "verified_at" => iso,
      },
      "attested_at" => iso,
    }
  end

  # SHA-256 hex of the raw 32 bytes — same algorithm used in keys/platform/<id>.info.json.
  def self.fingerprint(pubkey_b64)
    raw = Base64.strict_decode64(pubkey_b64)
    Digest::SHA256.hexdigest(raw)
  end

  # Wire-format JSON for embedding the attestation inside a .dpbundle or
  # returning it from the `/attestation/claim` endpoint. The verifier
  # re-canonicalizes `payload` and checks `signature` against the result.
  def to_attestation_json
    {
      "payload"   => JSON.parse(signed_payload_json),
      "signature" => "ed25519:#{signature_b64}",
    }
  end
end
