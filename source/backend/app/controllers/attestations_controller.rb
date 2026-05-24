# Attestation API endpoints (Phase 5 / F5.6.1, plus F_UNINSTALL revoke).
#
# `claim`  — exchanges the one-shot OAuth claim_code for the attestation JSON.
# `verify` — checks a posted attestation envelope and reports validity.
# `revoke` — per-attestation, dev-initiated revocation (F_UNINSTALL). The
#            developer signs `{action:"revoke", issued_at, timestamp}` with
#            their own Ed25519 private key; we set revoked_at on the row.

require "openssl"
require "base64"
require "json"
require "digest"

class AttestationsController < ApplicationController
  REVOKE_WINDOW_SECONDS = 600 # ±10 min — tolerates moderate clock skew

  def claim
    code = params[:claim_code].to_s
    return render(json: { error: "missing claim_code" }, status: :bad_request) if code.blank?

    data = OauthStateStore.new.take_claim(code)
    return render(json: { error: "unknown or expired claim_code" }, status: :not_found) if data.nil?

    render json: data
  end

  def verify
    body = begin
      JSON.parse(request.raw_post)
    rescue JSON::ParserError => e
      return render(json: { error: "invalid JSON: #{e.message}" }, status: :bad_request)
    end

    result = AttestationVerifier.verify(body)
    render json: {
      payload_valid:   result.payload_valid || false,
      signature_valid: result.signature_valid || false,
      key_status:      result.key_status,
      revoked_reason:  result.revoked_reason,
      platform_key_id: result.platform_key_id,
      github:          result.github,
      error:           result.error,
    }
  end

  # POST /api/attestation/revoke
  #
  # Body (all hex/iso strings):
  #   { public_key, issued_at, timestamp, signed_revocation }
  #
  # `public_key` is the raw 32-byte dev pubkey, hex-encoded — used both to
  # look up the attestation (via SHA-256 fingerprint) and to verify the
  # signature.
  #
  # `issued_at` is the original attestation timestamp (must match what we
  # have stored) — guards against blind replay-with-different-victim.
  #
  # `timestamp` is the dev's clock at signing — must be within ±10 min of
  # the server's now to prevent indefinitely-replayable revoke proofs.
  #
  # `signed_revocation` is Ed25519 over the canonical JSON of
  #   { "action": "revoke", "issued_at": ..., "timestamp": ... }
  # produced by PlatformKeySigner.canonicalize.
  def revoke
    body = begin
      JSON.parse(request.raw_post)
    rescue JSON::ParserError => e
      return render(json: { error: "invalid JSON: #{e.message}" }, status: :bad_request)
    end

    pub_hex   = body["public_key"].to_s
    issued_at = body["issued_at"].to_s
    timestamp = body["timestamp"].to_s
    sig_hex   = body["signed_revocation"].to_s

    if pub_hex.empty? || issued_at.empty? || timestamp.empty? || sig_hex.empty?
      return render(json: { error: "missing one of public_key, issued_at, timestamp, signed_revocation" }, status: :unprocessable_entity)
    end

    pub_raw = begin
      [pub_hex].pack("H*")
    rescue StandardError
      return render(json: { error: "public_key must be hex" }, status: :unprocessable_entity)
    end
    return render(json: { error: "public_key must decode to 32 bytes" }, status: :unprocessable_entity) unless pub_raw.bytesize == 32

    fingerprint  = Digest::SHA256.hexdigest(pub_raw)
    attestation  = Attestation.find_by(dev_pubkey_fingerprint: fingerprint)
    return render(json: { error: "attestation not found for public_key" }, status: :not_found) if attestation.nil?

    stored_iso = attestation.attested_at.utc.iso8601
    if stored_iso != issued_at
      return render(json: { error: "issued_at does not match stored attestation" }, status: :unprocessable_entity)
    end

    ts = begin
      Time.iso8601(timestamp)
    rescue ArgumentError
      return render(json: { error: "timestamp must be ISO 8601" }, status: :unprocessable_entity)
    end
    skew = (Time.current - ts).abs
    if skew > REVOKE_WINDOW_SECONDS
      return render(json: { error: "timestamp outside ±#{REVOKE_WINDOW_SECONDS}s window (off by #{skew.to_i}s)" }, status: :unprocessable_entity)
    end

    sig_raw = begin
      [sig_hex].pack("H*")
    rescue StandardError
      return render(json: { error: "signed_revocation must be hex" }, status: :unprocessable_entity)
    end
    return render(json: { error: "signature must decode to 64 bytes" }, status: :unprocessable_entity) unless sig_raw.bytesize == 64

    canonical = PlatformKeySigner.canonicalize(
      "action"    => "revoke",
      "issued_at" => issued_at,
      "timestamp" => timestamp,
    )

    pubkey = OpenSSL::PKey.new_raw_public_key("ED25519", pub_raw)
    unless pubkey.verify(nil, sig_raw, canonical)
      return render(json: { error: "signature does not verify against public_key" }, status: :unprocessable_entity)
    end

    if attestation.revoked_at.present?
      return render(json: { revoked: true, already_revoked: true, revoked_at: attestation.revoked_at.utc.iso8601 })
    end

    attestation.update!(revoked_at: Time.current)
    render json: { revoked: true, revoked_at: attestation.revoked_at.utc.iso8601 }
  end
end
