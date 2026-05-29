# Public-facing endpoints for verified profile snapshots
# (Phase 5 / F5.5; Phase 6 / Obj 2 — server-rendered HTML).
#
# GET /v/:id
#   HTML (default): full profile page rendered server-side.  Scores, L1 and L2
#                   sections are visible without JavaScript; the Ed25519
#                   verification runs progressively via inline JS.
#   JSON (Accept):  the full .dpbundle JSON (kept for backward compat with the
#                   Vite SPA + CLI verify flow).
#
# GET /v/:id/badge.svg
#   shields.io-style SVG badge.  Three color buckets (≥75 green, 50–74 yellow,
#   <50 red).  Supports `?style=flat|for-the-badge` and `?label=...`.
#
# GET /v/:id/summary
#   Lightweight JSON view (scores + signals + metadata) without proof fields —
#   for casual rendering / OpenGraph previews.

class VController < ActionController::Base
  include LocaleSelectable
  helper VHelper

  # No CSRF for these public GET endpoints — there's no mutable state and no
  # cookies.  `with: :null_session` keeps Rails happy without enabling session
  # storage.
  protect_from_forgery with: :null_session

  layout "profile", only: [:show_html]

  def show
    @snapshot = snapshot_for_id
    respond_to do |format|
      format.html { render :show, layout: "profile" }
      format.json { render json: @snapshot.payload }
    end
  end

  def summary
    render json: snapshot_for_id.public_view
  end

  def badge
    b = snapshot_for_id
    score = b.payload.dig("payload", "scores", "overall").to_i
    style = (params[:style].presence || "flat").to_s
    label = params[:label].presence&.to_s || "beheld"
    response.headers["Cache-Control"] = "public, max-age=300"
    response.headers["Content-Type"]  = "image/svg+xml; charset=utf-8"
    render plain: build_badge_svg(score: score, style: style, label: label)
  end

  private

  # Public lookup intentionally returns expired snapshots too — the view shows
  # a warning banner and the content stays visible "para referência histórica"
  # (Phase 6 / Obj 2). 404 is reserved for non-existent short_ids.
  def snapshot_for_id
    Snapshot.find_by!(short_id: params[:id])
  rescue ActiveRecord::RecordNotFound
    raise ActionController::RoutingError, "snapshot not found"
  end

  # ── badge SVG ──────────────────────────────────────────────────────────────

  ALLOWED_STYLES = %w[flat for-the-badge].freeze

  def build_badge_svg(score:, style:, label:)
    style = "flat" unless ALLOWED_STYLES.include?(style)
    color = score_hex(score)
    value = "verified #{score}"

    if style == "for-the-badge"
      build_badge_for_the_badge(label: label, value: value, color: color)
    else
      build_badge_flat(label: label, value: value, color: color)
    end
  end

  def score_hex(score)
    case score
    when 75..100 then "22c55e"
    when 50..74  then "eab308"
    else              "ef4444"
    end
  end

  def text_width(text, char_px:)
    # Crude approximation — Verdana 11px averages ~6.5px per char + 16px padding.
    (text.length * char_px + 16).round
  end

  def build_badge_flat(label:, value:, color:)
    label_w = text_width(label, char_px: 6.5)
    value_w = text_width(value, char_px: 6.5)
    total_w = label_w + value_w
    label_center = label_w / 2
    value_center = label_w + value_w / 2

    <<~SVG.strip
      <svg xmlns="http://www.w3.org/2000/svg" width="#{total_w}" height="20" role="img" aria-label="#{label}: #{value}">
        <linearGradient id="s" x2="0" y2="100%">
          <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
          <stop offset="1" stop-opacity=".1"/>
        </linearGradient>
        <mask id="m"><rect width="#{total_w}" height="20" rx="3" fill="#fff"/></mask>
        <g mask="url(#m)">
          <rect width="#{label_w}" height="20" fill="#555"/>
          <rect x="#{label_w}" width="#{value_w}" height="20" fill="##{color}"/>
          <rect width="#{total_w}" height="20" fill="url(#s)"/>
        </g>
        <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
          <text x="#{label_center}" y="14">#{label}</text>
          <text x="#{value_center}" y="14">#{value}</text>
        </g>
      </svg>
    SVG
  end

  def build_badge_for_the_badge(label:, value:, color:)
    label_u = label.upcase
    value_u = value.upcase
    label_w = text_width(label_u, char_px: 8)
    value_w = text_width(value_u, char_px: 8)
    total_w = label_w + value_w
    label_center = label_w / 2
    value_center = label_w + value_w / 2

    <<~SVG.strip
      <svg xmlns="http://www.w3.org/2000/svg" width="#{total_w}" height="28" role="img" aria-label="#{label}: #{value}">
        <g>
          <rect width="#{label_w}" height="28" fill="#555"/>
          <rect x="#{label_w}" width="#{value_w}" height="28" fill="##{color}"/>
        </g>
        <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" font-weight="bold">
          <text x="#{label_center}" y="18">#{label_u}</text>
          <text x="#{value_center}" y="18">#{value_u}</text>
        </g>
      </svg>
    SVG
  end
end
