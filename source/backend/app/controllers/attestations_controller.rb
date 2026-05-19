# Attestation API endpoints (Phase 5 / F5.6.1).
#
# Today only the `claim` action lives here; `verify` and the
# revocation-status query land in the next commits.

class AttestationsController < ApplicationController
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
end
