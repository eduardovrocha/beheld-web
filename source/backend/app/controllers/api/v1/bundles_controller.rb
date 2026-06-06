# Publishes a signed .dpbundle uploaded by the CLI (`beheld --share`).
#
# Flow:
#   1. Decode the base64 wrapper → parse JSON envelope.
#   2. Verify the bundle's Ed25519 signature against the externally supplied
#      `fingerprint` (the dev's public key, hex-encoded). The bundle is only
#      stored if the signature checks out — bad uploads can't pollute the
#      portal.
#   3. find_or_create Account by fingerprint. On creation, persist the
#      `email_recovery` field when present.
#   4. Upsert the *active* bundle for the account in place — one dev has at
#      most one published bundle. Slug is stable across re-publishes.

require "canonical_json"

module Api
  module V1
    class BundlesController < ApplicationController
      SLUG_LENGTH = 9

      def create
        fingerprint = params[:fingerprint].to_s.strip
        bundle_b64  = params[:bundle].to_s
        email_rec   = params[:email_recovery].to_s.strip.presence

        if fingerprint.empty? || bundle_b64.empty?
          return render json: { error: "missing_fields" }, status: :bad_request
        end

        bundle_json = decode_bundle(bundle_b64)
        return render(json: { error: "invalid_bundle_format" }, status: :unprocessable_entity) if bundle_json.nil?

        unless signature_valid?(bundle_json: bundle_json, fingerprint: fingerprint)
          return render json: { error: "invalid_signature" }, status: :unprocessable_entity
        end

        account = Account.find_by(fingerprint: fingerprint)
        account_created = account.nil?

        if account.nil?
          account = Account.create!(fingerprint: fingerprint, email_recovery: email_rec)
        end

        bundle = upsert_active_bundle(account: account, bundle_json: bundle_json)

        render json: {
          url:             "#{portal_host}/v/#{bundle.url_slug}",
          account_created: account_created,
          bundle_id:       bundle.id.to_s,
        }, status: :created
      end

      private

      # base64 → JSON. Returns nil on any decoding/parsing error and also when
      # the envelope is missing the fields we need for signature verification.
      def decode_bundle(b64)
        raw = Base64.strict_decode64(b64)
        parsed = JSON.parse(raw)
        return nil unless parsed.is_a?(Hash) && parsed["payload"].is_a?(Hash) && parsed["signature"].is_a?(String)
        parsed
      rescue ArgumentError, JSON::ParserError
        nil
      end

      def signature_valid?(bundle_json:, fingerprint:)
        sig_hex = bundle_json["signature"].sub(/\Aed25519:/, "")
        key_bytes = hex_to_bytes(fingerprint)
        sig_bytes = hex_to_bytes(sig_hex)
        return false if key_bytes.nil? || sig_bytes.nil?

        message = CanonicalJson.dump(bundle_json["payload"]).b
        Ed25519::VerifyKey.new(key_bytes).verify(sig_bytes, message)
      rescue Ed25519::VerifyError, ArgumentError, RuntimeError
        false
      end

      def hex_to_bytes(hex)
        return nil unless hex.is_a?(String) && hex.match?(/\A[0-9a-fA-F]+\z/) && hex.length.even?
        [hex].pack("H*")
      end

      # One active Bundle per Account. Re-publish updates last_bundle_at and
      # bundle_data on the existing row so the public URL (/v/<slug>) stays
      # stable for everyone who already has it.
      def upsert_active_bundle(account:, bundle_json:)
        active = account.bundles.active.first
        if active
          active.update!(bundle_data: bundle_json, last_bundle_at: Time.current)
          active
        else
          account.bundles.create!(
            url_slug:       generate_unique_slug,
            bundle_data:    bundle_json,
            published_at:   Time.current,
            last_bundle_at: Time.current,
          )
        end
      end

      def generate_unique_slug
        loop do
          candidate = SecureRandom.alphanumeric(SLUG_LENGTH).downcase
          break candidate unless Bundle.exists?(url_slug: candidate)
        end
      end

      def portal_host
        ENV.fetch("PORTAL_PUBLIC_URL").sub(%r{/+\z}, "")
      end
    end
  end
end
