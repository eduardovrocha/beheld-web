# Recruiter → dev contact, JSON API for the SPA at
# `:5173/accounts/:account_id/contact`. Mirrors the existing server-rendered
# ContactsController contract: 404 when the account opted out or has no
# bundle; 401 (JSON) when the recruiter isn't logged in.

module Api
  module V1
    class ContactsController < ApplicationController
      include ActionController::Cookies
      include CompanyAuthenticated

      # Override the concern's HTML redirect.
      def authenticate_company!
        company_id = cookies.signed[CompanyAuthenticated::COOKIE_NAME]
        @current_company = ::Company.find_by(id: company_id) if company_id.present?
        return if @current_company

        cookies.delete(CompanyAuthenticated::COOKIE_NAME) if company_id.present?
        render json: { ok: false, error: "unauthenticated" }, status: :unauthorized
      end

      # GET /api/v1/accounts/:account_id/contact
      def show
        account = lookup_target_account
        return if account.nil?

        render json: { ok: true, account: { id: account.id, handle: account.display_handle } }
      end

      # POST /api/v1/accounts/:account_id/contact
      def create
        account = lookup_target_account
        return if account.nil?

        job_title = params[:job_title].to_s.strip.presence
        body      = params[:body].to_s.strip.presence
        if job_title.nil? && body.nil?
          return render json: { ok: false, error: "missing_content",
                                message: "Inclua um cargo ou uma mensagem." },
                        status: :unprocessable_entity
        end

        message = Message.create!(
          company:   @current_company,
          account:   account,
          job_title: job_title,
          body:      body || job_title,
          sent_at:   Time.current,
        )
        render json: { ok: true, message_id: message.id }, status: :created
      end

      private

      # 404 (JSON) on any of: bad id, opt-out, no active bundle. Returns nil
      # after rendering so the caller can short-circuit.
      def lookup_target_account
        account = Account.find_by(id: params[:account_id])
        unavailable! && (return nil) if account.nil?
        unavailable! && (return nil) unless account.directory?
        unavailable! && (return nil) if account.bundles.active.none?
        account
      end

      def unavailable!
        render json: { ok: false, error: "unavailable" }, status: :not_found
        true
      end
    end
  end
end
