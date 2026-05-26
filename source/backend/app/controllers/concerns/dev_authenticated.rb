# Resolves the current DevSession from an Authorization: Bearer token
# (preferred) or `_beheld_session` cookie (fallback, when cookies middleware
# is enabled). Sets `@current_account` / `@current_session` or renders 401.
#
# This controller mountpoint is API-only (see config/application.rb), so the
# Bearer header is the canonical path. Cookies are read defensively — if the
# middleware isn't loaded, `request.cookies` returns {} and we just skip.

module DevAuthenticated
  extend ActiveSupport::Concern

  COOKIE_NAME = "_beheld_session".freeze

  included do
    before_action :authenticate_dev!
  end

  private

  def authenticate_dev!
    token = bearer_token || cookie_token
    return render_unauthenticated("missing_token") if token.blank?

    session = DevSession.active.find_by(token: token)
    return render_unauthenticated("invalid_token") if session.nil?

    @current_session = session
    @current_account = session.account
  end

  def bearer_token
    header = request.headers["Authorization"].to_s
    return nil unless header.start_with?("Bearer ")
    header.split(" ", 2).last&.strip.presence
  end

  def cookie_token
    request.cookies[COOKIE_NAME].presence
  rescue StandardError
    nil
  end

  def render_unauthenticated(reason)
    render json: { error: "unauthenticated", reason: reason }, status: :unauthorized
  end
end
