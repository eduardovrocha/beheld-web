# Upload endpoint for signed .dpbundle snapshots (Phase 5 / F5.4-5).
#
# POST /bundles
#   Body: the full .dpbundle JSON as produced by `devprofile snapshot`
#   201: { id, url, ttl_days, created_at }
#   200: same shape + deduplicated: true  (when re-uploading by bundle_hash)
#   400: malformed JSON
#   422: validation errors (bad hash/pubkey format, missing fields)

class BundlesController < ApplicationController
  REQUIRED_TOP_LEVEL_FIELDS = %w[version payload hash signature public_key].freeze

  def create
    raw = request.raw_post
    bundle_json = JSON.parse(raw)

    missing = REQUIRED_TOP_LEVEL_FIELDS - bundle_json.keys
    if missing.any?
      return render(
        json: { error: "missing required fields", missing: missing },
        status: :unprocessable_entity,
      )
    end

    existing = Bundle.find_by(bundle_hash: bundle_json["hash"])
    if existing
      return render_bundle_response(existing, status: :ok, deduplicated: true)
    end

    bundle = Bundle.new(
      bundle_hash: bundle_json["hash"],
      public_key:  bundle_json["public_key"],
      payload:     bundle_json,
    )

    if bundle.save
      render_bundle_response(bundle, status: :created)
    else
      render json: { errors: bundle.errors.full_messages }, status: :unprocessable_entity
    end
  rescue JSON::ParserError => e
    render json: { error: "invalid JSON: #{e.message}" }, status: :bad_request
  end

  private

  def render_bundle_response(bundle, status:, deduplicated: false)
    ttl = bundle.ttl_days_remaining
    response.headers["X-TTL"] = ttl.to_s if ttl
    body = {
      id: bundle.short_id,
      url: "#{request.protocol}#{request.host_with_port}/v/#{bundle.short_id}",
      ttl_days: ttl,
      created_at: bundle.created_at.iso8601,
    }
    body[:deduplicated] = true if deduplicated
    render json: body, status: status
  end
end
