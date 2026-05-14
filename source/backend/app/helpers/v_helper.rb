module VHelper
  # ── score colors (verde ≥75 / amarelo 50–74 / vermelho <50) ────────────────
  #
  # Three buckets, applied consistently in score bars + badge SVG. The badge
  # controller uses score_hex (without "#") for SVG attributes; views use
  # score_class for Tailwind/utility classes.

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

  # Background + text class pairs used by score bars and the overall card.
  def score_bg_class(score)
    case score_bucket(score)
    when :green  then "bg-emerald-500"
    when :yellow then "bg-amber-500"
    else              "bg-rose-500"
    end
  end

  def score_text_class(score)
    case score_bucket(score)
    when :green  then "text-emerald-300"
    when :yellow then "text-amber-300"
    else              "text-rose-300"
    end
  end

  # ── L1 helpers ─────────────────────────────────────────────────────────────

  # "Mar 2019 → Nov 2025" — falls back to "—" when timestamps are absent.
  def format_l1_period(l1)
    earliest = parse_iso(l1["earliest_commit"])
    latest   = parse_iso(l1["latest_commit"])
    return "—" if earliest.nil? || latest.nil?
    "#{l10n_month_year(earliest)} → #{l10n_month_year(latest)}"
  end

  def l1_present?(l1)
    l1.is_a?(Hash) && l1["total_repos"].to_i > 0
  end

  # Boolean dict → " · "-joined list of keys where v == true.
  def join_true_keys(hash)
    return "—" unless hash.is_a?(Hash)
    keys = hash.select { |_, v| v }.keys
    keys.empty? ? "—" : keys.join(" · ")
  end

  # ── L2 / signals helpers ───────────────────────────────────────────────────

  # Workflow distribution top-3 formatted as "TDD 23% · Test-after 39% · ...".
  def format_workflow_distribution(dist, limit: 3)
    return "—" unless dist.is_a?(Hash) && dist.any?
    dist.sort_by { |_, v| -v.to_f }.first(limit).map do |label, value|
      "#{humanize_workflow(label)} #{(value.to_f * 100).round}%"
    end.join(" · ")
  end

  # Numeric dict → "key1 · key2 · ..." sorted by value desc.
  def join_top_keys_by_value(hash, limit: 6)
    return "—" unless hash.is_a?(Hash) && hash.any?
    hash.sort_by { |_, v| -v.to_f }.first(limit).map { |k, _| k }.join(" · ")
  end

  # ── expiration banner ──────────────────────────────────────────────────────

  def bundle_expired?(bundle)
    bundle.expires_at.present? && bundle.expires_at < Time.current
  end

  def format_expiration_date(bundle)
    return nil unless bundle.expires_at
    l10n_day_month_year(bundle.expires_at)
  end

  # ── creation date ──────────────────────────────────────────────────────────

  def format_created_at(iso)
    dt = parse_iso(iso) || bundle.created_at
    l10n_day_month_year(dt)
  end

  def format_created_at_long(iso)
    dt = parse_iso(iso)
    return "—" unless dt
    "#{l10n_day_month_year(dt)} às #{dt.strftime('%H:%M')}"
  end

  # ── public key truncation ──────────────────────────────────────────────────

  def truncate_pubkey(pk)
    return "—" if pk.blank?
    raw = pk.sub(/^ed25519:/, "")
    raw.length > 16 ? "#{raw.first(16)}…" : raw
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
  }.freeze

  def humanize_workflow(key)
    WORKFLOW_LABELS[key.to_s] || key.to_s.humanize
  end
end
