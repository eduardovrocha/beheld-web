# Reads the signed `_beheld_company_session` cookie set by
# `Sessions::CompanySessionsController#verify`, resolves the Company, and
# redirects unauthenticated visitors to the magic-link login form.

module CompanyAuthenticated
  extend ActiveSupport::Concern

  COOKIE_NAME = :_beheld_company_session

  included do
    before_action :authenticate_company!
  end

  private

  def authenticate_company!
    company_id = cookies.signed[COOKIE_NAME]
    @current_company = Company.find_by(id: company_id) if company_id.present?
    return if @current_company

    cookies.delete(COOKIE_NAME) if company_id.present?
    redirect_to new_company_session_path, alert: "Faça login para continuar."
  end

  def current_company
    @current_company
  end
end
