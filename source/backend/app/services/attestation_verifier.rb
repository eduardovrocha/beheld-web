# Identity attestation verifier (Phase 5 / F5.6.1).
#
# Validates the wire-format attestation:
#   { "payload" => { ... signed content ... }, "signature" => "ed25519:<b64>" }
#
# Returns a Result with four orthogonal facts — the verifier deliberately
# never collapses to a single "trusted" boolean. The caller composes its own
# trust tier from these signals (see documents/platform-key-ops.md).
#
#   payload_valid    shape + required fields + supported type
#   signature_valid  Ed25519 verification against canonicalized payload
#   key_status       "active" / "rotated" / "revoked" / "unknown"
#   github           the bound GitHub identity (when payload_valid)

require "openssl"
require "base64"

class AttestationVerifier
  EXPECTED_TYPE = Attestation::ATTESTATION_TYPE
  REQUIRED_PAYLOAD_FIELDS = %w[type platform_key_id dev_pubkey github attested_at].freeze
  REQUIRED_GITHUB_FIELDS  = %w[user_id login verified_at].freeze
  SIGNATURE_RE = /\Aed25519:([A-Za-z0-9+\/=]+)\z/.freeze

  Result = Struct.new(
    :payload_valid,
    :signature_valid,
    :key_status,
    :revoked_reason,
    :platform_key_id,
    :github,
    :error,
    keyword_init: true,
  )

  def self.verify(attestation_hash, platform_keys: PlatformKey.all)
    new(platform_keys: platform_keys).verify(attestation_hash)
  end

  def initialize(platform_keys:)
    @platform_keys = platform_keys
  end

  def verify(attestation_hash)
    return malformed("attestation is not an object") unless attestation_hash.is_a?(Hash)

    payload   = attestation_hash["payload"]
    signature = attestation_hash["signature"].to_s

    payload_check = validate_payload(payload)
    return payload_check unless payload_check.payload_valid

    m = signature.match(SIGNATURE_RE)
    return Result.new(
      payload_valid: true, signature_valid: false, error: "malformed signature",
      platform_key_id: payload["platform_key_id"], github: payload["github"],
    ) unless m

    key = @platform_keys.find { |k| k["key_id"] == payload["platform_key_id"] }
    if key.nil?
      return Result.new(
        payload_valid: true, signature_valid: false, key_status: "unknown",
        error: "unknown platform_key_id", platform_key_id: payload["platform_key_id"],
        github: payload["github"],
      )
    end

    sig_valid = verify_signature(key, payload, m[1])
    Result.new(
      payload_valid:   true,
      signature_valid: sig_valid,
      key_status:      classify_key_status(key),
      revoked_reason:  key["revoked_reason"],
      platform_key_id: key["key_id"],
      github:          payload["github"],
      error:           sig_valid ? nil : "signature verification failed",
    )
  end

  private

  def validate_payload(payload)
    return malformed("payload missing or not an object") unless payload.is_a?(Hash)

    missing = REQUIRED_PAYLOAD_FIELDS - payload.keys
    return malformed("payload missing fields: #{missing.join(', ')}") if missing.any?
    return malformed("unsupported payload type: #{payload['type']}") unless payload["type"] == EXPECTED_TYPE

    return malformed("github missing or not an object") unless payload["github"].is_a?(Hash)
    missing_gh = REQUIRED_GITHUB_FIELDS - payload["github"].keys
    return malformed("github missing fields: #{missing_gh.join(', ')}") if missing_gh.any?

    Result.new(payload_valid: true)
  end

  def malformed(reason)
    Result.new(payload_valid: false, signature_valid: false, error: reason)
  end

  def verify_signature(key, payload, sig_b64)
    pub_b64 = key["public_key"].to_s.sub(/\Aed25519-pub:/, "")
    raw_pub = Base64.strict_decode64(pub_b64)
    pkey    = OpenSSL::PKey.new_raw_public_key("ED25519", raw_pub)
    canonical = PlatformKeySigner.canonicalize(payload)
    sig_raw   = Base64.strict_decode64(sig_b64)
    pkey.verify(nil, sig_raw, canonical)
  rescue ArgumentError, OpenSSL::PKey::PKeyError
    false
  end

  def classify_key_status(key)
    if key["revoked"]
      "revoked"
    elsif !key["active"]
      "rotated"
    else
      "active"
    end
  end
end
