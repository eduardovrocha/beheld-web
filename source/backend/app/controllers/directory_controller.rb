# beheld.dev/directory — searchable index of devs who opted into the public
# directory (`Account.directory = true`) and currently have an active bundle
# on the portal.
#
# Filters speak the same language as bundle signals:
#   - ecosystems / languages → `payload.l1.ecosystems` (presence map)
#   - test_ratio_{min,max}   → `payload.l1.avg_test_ratio` (0..1 float)
#   - status                 → fresh (< 30d) vs outdated (≥ 30d)
#
# Never returns email_contact / phone_contact — the dashboard view never
# even reads those columns. A recruiter who wants to talk to a dev sends an
# inbound Message, which the dev then accepts via "Responder".

class DirectoryController < ActionController::Base
  include CompanyAuthenticated

  layout "company"
  protect_from_forgery with: :exception

  helper_method :current_company

  RESULT_LIMIT = 50
  PUBLISHED_FRESHNESS = 30.days

  # Path inside bundle_data → l1.ecosystems map (deep JSONB lookup).
  L1_ECOSYSTEMS_PATH    = %w[payload l1 ecosystems].freeze
  L1_TEST_RATIO_PATH    = %w[payload l1 avg_test_ratio].freeze

  def index
    @results = apply_filters(base_scope).limit(RESULT_LIMIT).to_a
    @available_ecosystems = collect_ecosystems(@results)
    @available_languages  = @available_ecosystems   # twin alias until L1 has a separate `languages` axis
    @filters = filter_state
  end

  private

  def base_scope
    Account
      .where(directory: true)
      .joins(:bundles)
      .where(bundles: { revoked_at: nil })
      .includes(bundles: :verifications)
      .distinct
  end

  def apply_filters(scope)
    scope = filter_by_ecosystems(scope, picked_ecosystems)
    scope = filter_by_test_ratio(scope, params[:test_ratio_min], params[:test_ratio_max])
    scope = filter_by_status(scope, params[:status])
    scope
  end

  def picked_ecosystems
    raw = (params[:ecosystems].is_a?(Array) ? params[:ecosystems] : []) +
          (params[:languages].is_a?(Array)  ? params[:languages]  : [])
    raw.compact_blank.uniq
  end

  # Use `jsonb_exists_any` — the function form of the `?|` JSONB operator —
  # so Rails' bind-placeholder parser doesn't choke on the literal `?`.
  # Each ecosystem name is quoted through the adapter to keep the inline
  # `text[]` array injection-safe.
  def filter_by_ecosystems(scope, ecosystems)
    return scope if ecosystems.empty?
    conn = ActiveRecord::Base.connection
    literal = ecosystems.map { |e| conn.quote(e) }.join(",")
    scope.where(
      "jsonb_exists_any(bundles.bundle_data #> '{payload,l1,ecosystems}', ARRAY[#{literal}]::text[])",
    )
  end

  def filter_by_test_ratio(scope, min, max)
    min_f = parse_ratio(min)
    max_f = parse_ratio(max)
    return scope if min_f.nil? && max_f.nil?

    expr = "(bundles.bundle_data #>> ARRAY['payload','l1','avg_test_ratio'])::float"
    scope = scope.where("#{expr} >= ?", min_f) if min_f
    scope = scope.where("#{expr} <= ?", max_f) if max_f
    scope
  end

  def filter_by_status(scope, status)
    case status
    when "verified"
      scope.where("bundles.last_bundle_at > ?", PUBLISHED_FRESHNESS.ago)
    when "outdated"
      scope.where("bundles.last_bundle_at <= ?", PUBLISHED_FRESHNESS.ago)
    else
      scope
    end
  end

  def parse_ratio(value)
    return nil if value.blank?
    f = Float(value, exception: false)
    return nil if f.nil?
    f.clamp(0.0, 1.0)
  end

  def filter_state
    {
      ecosystems:      params[:ecosystems].is_a?(Array) ? params[:ecosystems] : [],
      languages:       params[:languages].is_a?(Array)  ? params[:languages]  : [],
      test_ratio_min:  params[:test_ratio_min].to_s,
      test_ratio_max:  params[:test_ratio_max].to_s,
      status:          params[:status].to_s.presence || "all",
    }
  end

  # Build the union of ecosystems present across the current result set.
  # Sorted alphabetically and unique-d.
  def collect_ecosystems(accounts)
    accounts
      .flat_map { |a| a.bundles.flat_map { |b| extract_keys(b.bundle_data, L1_ECOSYSTEMS_PATH) } }
      .compact
      .uniq
      .sort
  end

  def extract_keys(hash, path)
    return [] unless hash.is_a?(Hash)
    node = path.reduce(hash) { |acc, key| acc.is_a?(Hash) ? acc[key] : nil }
    node.is_a?(Hash) ? node.keys : []
  end

  def current_company
    @current_company
  end
end
