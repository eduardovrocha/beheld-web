# Phase 5 / F5.6.1 — identity attestation storage.
#
# Each row binds a developer's Ed25519 public key to a verified GitHub
# identity via a signature produced by the DevProfile platform key. The
# signed payload bytes are preserved verbatim in `signed_payload_json` so
# that verifiers (CLI, SPA) can re-derive signature verification without
# guessing at JSON canonicalization rules — they receive the same bytes
# that were signed.
#
# Revocation status is NOT stored here: it cascades from the platform
# key's own `revoked` flag (see app/models/platform_key.rb).

class CreateAttestations < ActiveRecord::Migration[7.2]
  def change
    create_table :attestations do |t|
      t.string   :dev_pubkey_b64,         null: false
      # SHA-256 hex of the raw 32 bytes — for indexed lookups + dedup signals.
      t.string   :dev_pubkey_fingerprint, null: false
      # GitHub numeric user ID — stable even when the login changes.
      t.bigint   :github_user_id,         null: false
      # GitHub login at the moment of attestation (snapshot, may go stale).
      t.string   :github_login,           null: false
      # Which platform key signed this row; joins to keys/platform/<id>.info.json.
      t.string   :platform_key_id,        null: false
      # The exact canonical JSON bytes that were signed. Verifiers re-derive
      # the signature against these bytes verbatim.
      t.text     :signed_payload_json,    null: false
      # Base64 of the raw 64-byte Ed25519 signature over signed_payload_json.
      t.string   :signature_b64,          null: false
      # Timestamp embedded inside the signed payload (cryptographically committed).
      t.datetime :attested_at,            null: false

      t.timestamps
    end

    add_index :attestations, :dev_pubkey_fingerprint
    add_index :attestations, :github_user_id
    add_index :attestations, :platform_key_id
  end
end
