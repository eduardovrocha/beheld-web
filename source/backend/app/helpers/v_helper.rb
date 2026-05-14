module VHelper
  # ── score colors (verde ≥75 / amarelo 50–74 / vermelho <50) ────────────────

  def score_bucket(score)
    s = score.to_i
    return :green  if s >= 75
    return :yellow if s >= 50
    :red
  end

  def score_hex(score)
    case score_bucket(score)
    when :green  then "22c55e"
    when :yellow then "eab308"
    else              "ef4444"
    end
  end

  def score_text_class(score)
    case score_bucket(score)
    when :green  then "text-green"
    when :yellow then "text-yellow"
    else              "text-red"
    end
  end

  def score_fill_class(score)
    "fill-#{score_bucket(score)}"
  end

  # ── L1 helpers ─────────────────────────────────────────────────────────────

  def format_l1_period(l1)
    earliest = parse_iso(l1["earliest_commit"])
    latest   = parse_iso(l1["latest_commit"])
    return "—" if earliest.nil? || latest.nil?
    "#{l10n_month_year(earliest)} → #{l10n_month_year(latest)}"
  end

  # "2015 → 2025" — apenas anos, para a coluna "Activity Window".
  def format_l1_activity_window(l1)
    earliest = parse_iso(l1["earliest_commit"])
    latest   = parse_iso(l1["latest_commit"])
    return "—" if earliest.nil? || latest.nil?
    "#{earliest.year} → #{latest.year}"
  end

  # Color class for the L1 Average Test Ratio value — same bands as the
  # tooltip's reference scale.  Returns a class hook backed by the
  # `--score-*` CSS variables defined in the layout.
  def test_ratio_color_class(value)
    v = value.to_f
    return "text-score-red"    if v < 0.10
    return "text-score-yellow" if v < 0.25
    return "text-score-green"  if v < 0.50
    "text-accent"
  end

  # Locale-aware short date — "14 mai 2026".  Used by the Last Commit
  # row so the reader sees the actual date, not just "Nd ago".
  def format_iso_date(iso)
    d = parse_iso(iso)
    return "—" unless d
    l10n_day_month_year(d)
  end

  def format_days_ago(iso)
    return "—" if iso.blank?
    dt = parse_iso(iso)
    return "—" unless dt
    days = ((Time.current - dt) / 86_400).floor
    return "today" if days <= 0
    return "1d ago" if days == 1
    "#{days}d ago"
  end

  def l1_present?(l1)
    l1.is_a?(Hash) && l1["total_repos"].to_i > 0
  end

  def join_true_keys(hash)
    return [] unless hash.is_a?(Hash)
    hash.select { |_, v| v }.keys
  end

  # ── L2 / signals helpers ───────────────────────────────────────────────────

  def l2_present?(l2)
    l2.is_a?(Hash) && l2["sessions_analyzed"].to_i > 0
  end

  def format_workflow_distribution(dist, limit: 3)
    return "—" unless dist.is_a?(Hash) && dist.any?
    dist.sort_by { |_, v| -v.to_f }.first(limit).map do |label, value|
      "#{humanize_workflow(label)} #{(value.to_f * 100).round}%"
    end.join(" · ")
  end

  def top_keys_by_value(hash, limit: 6)
    return [] unless hash.is_a?(Hash) && hash.any?
    hash.sort_by { |_, v| -v.to_f }.first(limit).map { |k, _| k }
  end

  # ── expiration ─────────────────────────────────────────────────────────────

  def bundle_expired?(bundle)
    bundle.expires_at.present? && bundle.expires_at < Time.current
  end

  def format_expiration_date(bundle)
    return nil unless bundle.expires_at
    l10n_day_month_year(bundle.expires_at)
  end

  # ── dates ──────────────────────────────────────────────────────────────────

  def format_created_at_long(iso)
    dt = parse_iso(iso)
    return "—" unless dt
    "#{l10n_day_month_year(dt)} às #{dt.strftime('%H:%M')}"
  end

  def format_iso_z(iso)
    dt = parse_iso(iso)
    return "—" unless dt
    dt.utc.strftime("%Y-%m-%dT%H:%M:%SZ")
  end

  # ── identity surface (no real name available) ──────────────────────────────

  # Two-char monogram derived from short_id. Deterministic + opaque — no PII.
  def short_id_initials(short_id)
    chars = short_id.to_s.gsub(/[^A-Za-z0-9]/, "").chars
    pick = chars.first(2).map(&:upcase).join
    pick.empty? ? "DP" : pick.ljust(2, "X")
  end

  # "m4Kk_1hPBN8" → "m4Kk-1hPB" — visually mimics the UUID style the mock used.
  def format_short_id(short_id)
    raw = short_id.to_s
    return raw if raw.length <= 8
    "#{raw[0, 4]}-#{raw[4, 4]}"
  end

  # ── public key + signature surface ────────────────────────────────────────

  def short_signature(sig)
    return "—" if sig.blank?
    sig.to_s
  end

  # ── chain → trend data (server-rendered chart) ────────────────────────────

  # Walks `bundle.payload['previous_hash']` recursively (capped at MAX_LINKS),
  # newest first.  Returns an Array of { period:, scores:, created_at: } in
  # chronological order so the chart paths read left-to-right.
  def trend_points(bundle, max_links: 24)
    chain = []
    visited = Set.new
    current = bundle
    while current && !visited.include?(current.id) && chain.size < max_links
      visited << current.id
      inner = current.payload.is_a?(Hash) ? (current.payload["payload"] || {}) : {}
      created_at = parse_iso(inner["created_at"]) || current.created_at
      chain << {
        created_at: created_at,
        scores: inner["scores"] || {},
      }
      prev_hash = inner["previous_hash"]
      break if prev_hash.blank?
      current = Bundle.find_by(bundle_hash: prev_hash)
    end
    chain.reverse
  end

  TREND_LINES = [
    { key: "overall",        label: "Overall",  stroke: "var(--primary)",          width: 2.5 },
    { key: "prompt_quality", label: "Prompt",   stroke: "var(--accent)",           width: 1.5 },
    { key: "test_maturity",  label: "Tests",    stroke: "var(--warning)",          width: 1.5 },
    { key: "tech_breadth",   label: "Breadth",  stroke: "var(--muted-foreground)", width: 1.5 },
    { key: "growth_rate",    label: "Growth",   stroke: "var(--foreground)",       width: 1.5 },
  ].freeze

  # ── trend stats (Net Δ, σ, consistency) ───────────────────────────────────

  def trend_stats(points)
    overall = points.map { |p| p[:scores]["overall"].to_i }
    return { net_delta: 0, sigma: 0.0, consistency: "—" } if overall.size < 2
    net_delta = overall.last - overall.first
    mean = overall.sum.to_f / overall.size
    variance = overall.sum { |x| (x - mean)**2 } / overall.size
    sigma = Math.sqrt(variance)
    {
      net_delta: net_delta,
      sigma: sigma.round(1),
      consistency: consistency_label(sigma),
    }
  end

  def consistency_label(sigma)
    case sigma
    when 0..2.5  then "Very High"
    when 2.5..6  then "High"
    when 6..12   then "Medium"
    else              "Low"
    end
  end

  def signed_delta(delta)
    return "0" if delta.zero?
    delta.positive? ? "+#{delta}" : delta.to_s
  end

  # ── SVG chart path generation ─────────────────────────────────────────────

  CHART_WIDTH  = 624
  CHART_HEIGHT = 218
  CHART_TOP    = 8
  CHART_BOTTOM = 226
  CHART_LEFT   = 24
  CHART_RIGHT  = 648

  def chart_x_for(idx, total)
    return CHART_LEFT if total <= 1
    CHART_LEFT + (CHART_RIGHT - CHART_LEFT) * idx.to_f / (total - 1)
  end

  def chart_y_for(score)
    s = [[score.to_i, 0].max, 100].min
    CHART_BOTTOM - (CHART_BOTTOM - CHART_TOP) * (s / 100.0)
  end

  # Returns the SVG `d` attribute for a monotone-cubic-ish line — for our small
  # point count a straight polyline is plenty and stays sharp at all densities.
  def chart_path_d(points, score_key)
    return "" if points.empty?
    total = points.size
    coords = points.each_with_index.map do |p, idx|
      x = chart_x_for(idx, total).round(2)
      y = chart_y_for(p[:scores][score_key].to_i).round(2)
      [x, y]
    end
    coords.each_with_index.map do |(x, y), i|
      "#{i.zero? ? 'M' : 'L'}#{x},#{y}"
    end.join
  end

  # X-axis tick labels: month "06", "07" …
  def chart_x_ticks(points)
    points.map { |p| p[:created_at].strftime("%m") }
  end

  private

  MESES_PT = %w[jan fev mar abr mai jun jul ago set out nov dez].freeze

  def parse_iso(value)
    return nil if value.blank?
    Time.iso8601(value.to_s)
  rescue ArgumentError
    nil
  end

  def l10n_month_year(dt)
    "#{MESES_PT[dt.month - 1].capitalize} #{dt.year}"
  end

  def l10n_day_month_year(dt)
    "#{dt.day} #{MESES_PT[dt.month - 1]} #{dt.year}"
  end

  WORKFLOW_LABELS = {
    "tdd" => "TDD",
    "test-after" => "Test-after",
    "test_after" => "Test-after",
    "debug-driven" => "Debug-driven",
    "debug_driven" => "Debug-driven",
    "feature-work" => "Feature work",
    "feature_work" => "Feature work",
    "refactor" => "Refactor",
    "exploration" => "Exploration",
    "exploratory" => "Exploration",
  }.freeze

  def humanize_workflow(key)
    WORKFLOW_LABELS[key.to_s] || key.to_s.humanize
  end
end
