# Dev-facing dashboard at /dashboard. Server-rendered Rails — no SPA.
#
# Entry point: after `beheld share` opens the browser at
# `/dashboard?session=<token>`, we move the token from the URL into the
# `_beheld_session` cookie so subsequent navigation stays clean.
#
# Auth: DevAuthenticated reads the bearer token (cookie or Authorization
# header) and resolves @current_account / @current_session.

class DashboardController < ActionController::Base
  include DevAuthenticated

  layout "dashboard"

  helper_method :current_account, :current_session

  # CSRF on POST/PATCH/DELETE forms. GETs are unaffected.
  protect_from_forgery with: :exception

  # Promotion must run BEFORE the DevAuthenticated `before_action :authenticate_dev!`
  # that the concern installs implicitly — otherwise the very first /dashboard?session=X
  # hit would 401 before the cookie is set.
  prepend_before_action :promote_session_param_to_cookie

  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found

  # GET /dashboard
  def index
    @bundles = current_account.bundles.active.order(published_at: :desc)
    @notifications = Verification
                       .where(bundle_id: @bundles.pluck(:id))
                       .where.not(company_id: nil)
                       .order(verified_at: :desc)
                       .includes(:company)
                       .limit(50)
    @messages = current_account.messages.order(sent_at: :desc).includes(:company)
    @contact_configured = current_account.contact_configured?
  end

  # PATCH /dashboard/settings
  def settings
    current_account.update!(settings_params)
    redirect_to dashboard_path, notice: "Configurações atualizadas."
  end

  # DELETE /dashboard/bundles/:id  → revoke
  def revoke_bundle
    bundle = current_account.bundles.find(params[:id])
    bundle.update!(revoked_at: Time.current)
    redirect_to dashboard_path, notice: "Bundle revogado."
  end

  # PATCH /dashboard/bundles/:id/toggle  → flip `visible`
  def toggle_bundle
    bundle = current_account.bundles.find(params[:id])
    bundle.update!(visible: !bundle.visible)
    redirect_to dashboard_path
  end

  # POST /dashboard/messages/:id/respond
  def respond_message
    msg = current_account.messages.find(params[:id])
    unless current_account.contact_configured?
      flash[:alert] = "Configure email e telefone de contato antes de responder."
      return render plain: flash[:alert], status: :unprocessable_entity
    end
    msg.update!(responded_at: Time.current)
    RespondContactJob.perform_later(msg.id)
    redirect_to dashboard_path, notice: "Seus contatos foram compartilhados."
  end

  # POST /dashboard/messages/:id/ignore
  def ignore_message
    msg = current_account.messages.find(params[:id])
    msg.update!(ignored_at: Time.current)
    redirect_to dashboard_path
  end

  private

  def current_account
    @current_account
  end

  def current_session
    @current_session
  end

  def settings_params
    params.permit(
      :email_recovery, :email_contact, :phone_contact,
      :directory, :watch,
      :notification_email, :notification_webhook,
    ).tap do |p|
      p[:directory] = ActiveModel::Type::Boolean.new.cast(p[:directory]).to_s == "true" if p.key?(:directory)
      p[:watch]     = ActiveModel::Type::Boolean.new.cast(p[:watch]).to_s     == "true" if p.key?(:watch)
    end
  end

  # First hop from the CLI lands at `/dashboard?session=<token>`. Move the
  # token into a signed cookie and redirect so the URL stays clean and the
  # token doesn't end up in browser history / Referer headers on outbound
  # links.
  def promote_session_param_to_cookie
    return if params[:session].blank?
    cookies[:_beheld_session] = {
      value:    params[:session],
      httponly: true,
      same_site: :lax,
      secure:   Rails.env.production?,
    }
    redirect_to(url_for(params: request.query_parameters.except("session")))
  end

  def record_not_found
    redirect_to dashboard_path, alert: "Recurso não encontrado."
  end
end
