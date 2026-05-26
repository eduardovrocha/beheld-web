# Shared base for the recruiter-facing JSON controllers under /api/v1/company.
# Pulls in cookies + the CompanyAuthenticated concern, but overrides the
# concern's HTML redirect with a JSON 401 (the SPA handles the routing).

module Api
  module V1
    module Company
      class BaseController < ApplicationController
        include ActionController::Cookies
        include CompanyAuthenticated

        rescue_from ActiveRecord::RecordNotFound do
          render json: { ok: false, error: "not_found" }, status: :not_found
        end

        private

        def authenticate_company!
          company_id = cookies.signed[CompanyAuthenticated::COOKIE_NAME]
          @current_company = ::Company.find_by(id: company_id) if company_id.present?
          return if @current_company

          cookies.delete(CompanyAuthenticated::COOKIE_NAME) if company_id.present?
          render json: { ok: false, error: "unauthenticated" }, status: :unauthorized
        end

        def current_company
          @current_company
        end

        # Stable status formatter shared by `dashboard#index` and
        # `messages#index` (DRY for the recent-activity feed).
        def message_status(message)
          return "responded" if message.responded?
          return "ignored"   if message.ignored?
          "pending"
        end
      end
    end
  end
end
