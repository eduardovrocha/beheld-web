# Public profile page at /v/:slug.
#
# Two slug spaces co-exist:
#   1. Bundle.url_slug — the new account-bound publication (preferred).
#   2. Snapshot.short_id — the legacy one-shot snapshot URLs, kept so links
#      shared before the Bundle/Snapshot split don't 404.
#
# Privacy guarantees:
#   - The view never reads email_contact / phone_contact / email_recovery.
#   - Revoked bundles render a 404 page with no payload data.

class ProfilesController < ActionController::Base
  include LocaleSelectable
  layout "profile"

  # The legacy `v/show.html.erb` uses helpers from VHelper (score colors,
  # badge SVG glue, trend chart). Make them available to the fallback render.
  helper VHelper

  rescue_from ActionController::RoutingError do |e|
    render plain: e.message, status: :not_found
  end

  # GET /v/:slug
  def show
    bundle = Bundle.find_by(url_slug: params[:slug])

    if bundle
      if bundle.revoked?
        @bundle = bundle
        return render :revoked, status: :not_found
      end

      @bundle       = bundle
      @bundle_data  = bundle.bundle_data || {}
      @status       = bundle.status
      @account      = bundle.account
      @handle       = @account&.display_handle || "dev-anonymous"

      # Frontend SPA (Vite at :5173) requests JSON; the server-rendered HTML
      # is kept as a fallback so the page works without JavaScript. CORS is
      # already permissive in dev (config/initializers/cors.rb).
      #
      # The portal account id rides in a response header (not in the JSON
      # body) so the wire-format Bundle struct stays untouched for offline
      # verifiers. The SPA reads it to wire features like "Save dev" that
      # need a stable Account reference, not a signed-bundle field.
      response.set_header("X-Beheld-Account-Id", @account.id.to_s) if @account
      respond_to do |format|
        format.html { render :show }
        format.json { render json: @bundle_data }
      end
      return
    end

    # Legacy fallback — old /v/<short_id> URLs continue to resolve. Mirror
    # the legacy VController#show content negotiation: HTML renders the
    # legacy template; JSON returns the raw signed payload for offline
    # verifiers that integrate with the previous shape.
    @snapshot = Snapshot.find_by(short_id: params[:slug])
    if @snapshot
      respond_to do |format|
        format.html { render "v/show", layout: "profile" }
        format.json { render json: @snapshot.payload }
      end
      return
    end

    raise ActionController::RoutingError, "perfil não encontrado"
  end

  # GET /v/:slug.dpbundle — re-download the raw signed bundle so a recruiter
  # can verify offline with `beheld verify`.
  def download
    bundle = Bundle.active.find_by(url_slug: params[:slug])
    raise ActionController::RoutingError, "perfil não encontrado" if bundle.nil?

    send_data(
      JSON.pretty_generate(bundle.bundle_data || {}),
      filename:    "beheld-#{bundle.url_slug}.dpbundle",
      type:        "application/json",
      disposition: "attachment",
    )
  end

end
