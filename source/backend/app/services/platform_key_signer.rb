# Ed25519 signing for identity attestations (Phase 5 / F5.6.1).
#
# Loads the active platform private key from the host environment and
# produces deterministic canonical-JSON signatures. The private key is
# never persisted to disk by this process — it lives only in the env var,
# materialized as an OpenSSL::PKey ED25519 in memory.
#
# Canonicalization: keys sorted recursively, compact JSON (no whitespace).
# The TypeScript verifier in `packages/cli/src/bundle` MUST mirror this
# exact algorithm so signatures verify across runtimes.
require "openssl"
require "base64"
require "json"

class PlatformKeySigner
  ENV_KEY_ID      = "BEHELD_PLATFORM_KEY_ID".freeze
  ENV_PRIVATE_KEY = "BEHELD_PLATFORM_PRIVATE_KEY".freeze

  class MissingConfiguration < StandardError; end
  class InvalidKey < StandardError; end

  attr_reader :key_id

  # Loads the signer from the active platform key env vars. Raises
  # MissingConfiguration if either var is unset or blank, InvalidKey if
  # the seed is not valid base64 or not 32 bytes long.
  def self.from_env
    key_id = ENV[ENV_KEY_ID].presence
    raise MissingConfiguration, "missing #{ENV_KEY_ID}" if key_id.nil?

    raw_b64 = ENV[ENV_PRIVATE_KEY].presence
    raise MissingConfiguration, "missing #{ENV_PRIVATE_KEY}" if raw_b64.nil?

    raw = begin
      Base64.strict_decode64(raw_b64)
    rescue ArgumentError => e
      raise InvalidKey, "private key is not valid base64: #{e.message}"
    end
    unless raw.bytesize == 32
      raise InvalidKey, "expected 32-byte raw Ed25519 seed, got #{raw.bytesize}"
    end

    new(key_id: key_id, raw_private_key: raw)
  end

  def initialize(key_id:, raw_private_key:)
    @key_id = key_id
    @pkey   = OpenSSL::PKey.new_raw_private_key("ED25519", raw_private_key)
  end

  # Returns the pair [canonical_json_string, signature_base64].
  def sign(payload_hash)
    canonical = self.class.canonicalize(payload_hash)
    signature = @pkey.sign(nil, canonical)
    [canonical, Base64.strict_encode64(signature)]
  end

  # Recursive key sort + compact JSON. Hash keys are normalized to strings
  # so a mix of symbol/string keys produces the same output.
  def self.canonicalize(value)
    JSON.generate(deep_sort_keys(value))
  end

  def self.deep_sort_keys(value)
    case value
    when Hash
      stringified = value.to_h { |k, v| [k.to_s, v] }
      stringified.keys.sort.each_with_object({}) do |k, h|
        h[k] = deep_sort_keys(stringified[k])
      end
    when Array
      value.map { |v| deep_sort_keys(v) }
    else
      value
    end
  end
end
