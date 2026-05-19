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
end
