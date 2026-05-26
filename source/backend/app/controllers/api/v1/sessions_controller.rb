# JSON session endpoints for the recruiter SPA.
#
# `verify_company` — exchanges a single-use MagicLink token for a signed
# `_beheld_company_session` cookie that the existing CompanyAuthenticated
# concern reads. Same semantics as the server-rendered
# Sessions::CompanySessionsController#verify, just JSON + CORS-safe.
#
# Requires `include ActionController::Cookies` because ActionController::API
# doesn't ship cookies by default — the middleware is on (see
# config/application.rb) but the controller accessor isn't.

module Api
  module V1
    class SessionsController < ApplicationController
      include ActionController::Cookies

      # POST /api/v1/sessions/company/verify  { token }
      def verify_company
        token = params[:token].to_s
        link  = MagicLink.find_by(token: token)
        return render_invalid(:not_found, status: :unauthorized) if link.nil?
        return render_invalid(:expired,   status: :unauthorized) if link.expired?
        return render_invalid(:used,      status: :unauthorized) if link.used?

        link.update!(used_at: Time.current)
        cookies.signed[CompanyAuthenticated::COOKIE_NAME] = {
          value:     link.company_id,
          httponly:  true,
          same_site: :lax,
          secure:    Rails.env.production?,
          expires:   30.days.from_now,
        }
        render json: {
          ok:           true,
          company:      { id: link.company.id, name: link.company.name, email: link.company.email },
          redirect_to:  "/directory",
        }, status: :ok
      end

      # POST /api/v1/sessions/company/request  { email }
      # Issues a fresh magic link for an existing Company. Mirrors the
      # server-rendered Sessions::CompanySessionsController#create — same
      # case-insensitive match and "email não cadastrado" semantics. Token
      # delivery goes via Sidekiq (deliver_later).
      MAGIC_LINK_TTL = 30.minutes

      def request_company_link
        email = params[:email].to_s.strip.downcase
        return render(json: { ok: false, reason: "missing_email" }, status: :bad_request) if email.empty?

        company = ::Company.find_by("LOWER(email) = ?", email)
        return render(json: { ok: false, reason: "not_registered" }, status: :not_found) if company.nil?

        MagicLink.create!(
          company:    company,
          token:      SecureRandom.hex(32),
          expires_at: MAGIC_LINK_TTL.from_now,
          created_at: Time.current,
        ).tap { |link| CompanyMailer.magic_link(company, link.token).deliver_later }

        render json: { ok: true, email: company.email }, status: :ok
      end

      # DELETE /api/v1/sessions/company
      def destroy_company
        cookies.delete(CompanyAuthenticated::COOKIE_NAME)
        render json: { ok: true }, status: :ok
      end

      private

      def render_invalid(reason, status:)
        render json: { ok: false, reason: reason }, status: status
      end
    end
  end
end
