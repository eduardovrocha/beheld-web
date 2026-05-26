# Challenge/response authentication for the dev CLI (and dashboard SPA).
#
# Flow:
#   1. CLI → POST /api/v1/auth/challenge { fingerprint }
#      Portal stores a fresh 32-byte nonce, returns it.
#   2. CLI signs the nonce bytes with the dev's Ed25519 private key.
#   3. CLI → POST /api/v1/auth/verify { fingerprint, nonce, signature }
#      Portal verifies the signature against the Account's public key,
#      burns the challenge, and issues a 24-hour DevSession token.
#   4. CLI opens https://beheld.dev/dashboard?session=<token> in the browser.
#
# The dev's private key never leaves their machine.

module Api
  module V1
    class AuthController < ApplicationController
      include DevAuthenticated

      # Auth is required only for `destroy` — `challenge` and `verify` are
      # the entry point to obtain a session and must run unauthenticated.
      skip_before_action :authenticate_dev!, only: %i[challenge verify]

      # POST /api/v1/auth/challenge
      def challenge
        fingerprint = params[:fingerprint].to_s.strip
        return render(json: { error: "fingerprint_required" }, status: :bad_request) if fingerprint.empty?

        unless Account.exists?(fingerprint: fingerprint)
          return render json: { error: "account_not_found" }, status: :not_found
        end

        nonce = SecureRandom.hex(32)
        AuthChallenge.create!(
          nonce: nonce,
          fingerprint: fingerprint,
          expires_at: AuthChallenge::TTL.from_now,
        )

        render json: { nonce: nonce, expires_in: AuthChallenge::TTL.to_i }, status: :ok
      end

      # POST /api/v1/auth/verify
      def verify
        fingerprint = params[:fingerprint].to_s.strip
        nonce       = params[:nonce].to_s.strip
        signature   = params[:signature].to_s.strip

        if fingerprint.empty? || nonce.empty? || signature.empty?
          return render json: { error: "missing_fields" }, status: :bad_request
        end

        challenge = AuthChallenge.find_by(nonce: nonce, fingerprint: fingerprint)
        return render(json: { error: "challenge_not_found" }, status: :unauthorized) if challenge.nil?
        return render(json: { error: "challenge_expired"  }, status: :unauthorized) if challenge.expired?
        return render(json: { error: "challenge_used"     }, status: :unauthorized) if challenge.used?

        account = Account.find_by(fingerprint: fingerprint)
        return render(json: { error: "account_not_found" }, status: :unauthorized) if account.nil?

        unless ed25519_signature_valid?(fingerprint: fingerprint, nonce: nonce, signature: signature)
          return render json: { error: "invalid_signature" }, status: :unauthorized
        end

        challenge.mark_used!
        session = DevSession.create!(
          account:    account,
          token:      SecureRandom.hex(32),
          expires_at: DevSession::TTL.from_now,
        )

        render json: {
          session_token: session.token,
          redirect_url:  "/dashboard?session=#{session.token}",
          expires_at:    session.expires_at.iso8601,
        }, status: :ok
      end

      # DELETE /api/v1/auth/session
      def destroy
        @current_session.revoke!
        render json: { ok: true }, status: :ok
      end

      private

      # Ed25519 verification follows the spec exactly — pack the hex strings
      # into raw bytes and let RbNaCl/ed25519 raise on any malformed input.
      def ed25519_signature_valid?(fingerprint:, nonce:, signature:)
        key_bytes = hex_to_bytes(fingerprint)
        sig_bytes = hex_to_bytes(signature)
        msg_bytes = hex_to_bytes(nonce)
        return false if key_bytes.nil? || sig_bytes.nil? || msg_bytes.nil?

        verify_key = Ed25519::VerifyKey.new(key_bytes)
        verify_key.verify(sig_bytes, msg_bytes)
      rescue Ed25519::VerifyError, ArgumentError, RuntimeError
        false
      end

      # Strict hex → bytes. Returns nil on non-hex input so the caller can
      # surface a single `invalid_signature` outcome instead of leaking a
      # 500 on malformed payloads.
      def hex_to_bytes(hex)
        return nil unless hex.is_a?(String) && hex.match?(/\A[0-9a-fA-F]+\z/) && hex.length.even?
        [hex].pack("H*")
      end
    end
  end
end
