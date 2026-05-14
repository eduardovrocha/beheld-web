# Public-facing endpoints for verified profile snapshots (Phase 5 / F5.5).
#
# GET /v/:id
#   Returns the full .dpbundle JSON. Consumers (browser frontends, the CLI's
#   `devprofile verify`) re-verify locally — server is just a content host.
#
# GET /v/:id/badge.svg
#   Renders a shields.io-style SVG with the overall score. Embeddable in
#   READMEs, LinkedIn, etc.
#
# GET /v/:id/summary
#   Lightweight JSON view (scores + signals + metadata) without proof fields —
#   for casual rendering / OpenGraph previews.

class VController < ApplicationController
  def show
    render json: bundle_for_id.payload
  end

  def summary
    render json: bundle_for_id.public_view
  end

  def badge
    b = bundle_for_id
    score = b.payload.dig("payload", "scores", "overall").to_i
    response.headers["Cache-Control"] = "public, max-age=300"
    response.headers["Content-Type"] = "image/svg+xml"
    render plain: build_badge_svg(score: score)
  end

  private

  def bundle_for_id
    Bundle.live.find_by!(short_id: params[:id])
  rescue ActiveRecord::RecordNotFound
    raise ActionController::RoutingError, "bundle not found or expired"
  end

  def build_badge_svg(score:)
    color = score_color(score)
    label = "devprofile"
    value = "#{score}/100"

    <<~SVG
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="20" role="img" aria-label="#{label}: #{value}">
        <linearGradient id="s" x2="0" y2="100%">
          <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
          <stop offset="1" stop-opacity=".1"/>
        </linearGradient>
        <mask id="m"><rect width="160" height="20" rx="3" fill="#fff"/></mask>
        <g mask="url(#m)">
          <rect width="90" height="20" fill="#555"/>
          <rect x="90" width="70" height="20" fill="##{color}"/>
          <rect width="160" height="20" fill="url(#s)"/>
        </g>
        <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
          <text x="45" y="14">#{label}</text>
          <text x="125" y="14">#{value}</text>
        </g>
      </svg>
    SVG
  end

  def score_color(score)
    case score
    when 80..100 then "4c1"   # green
    when 60..79  then "97ca00" # yellow-green
    when 40..59  then "dfb317" # yellow
    when 20..39  then "fe7d37" # orange
    else "e05d44"             # red
    end
  end
end
