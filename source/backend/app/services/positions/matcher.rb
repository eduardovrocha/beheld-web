# Position matching engine — spec sections 3, 4.
#
# Phase 1: filter directory-opted-in accounts by the position's thresholds.
# Phase 2: for accounts that passed all thresholds, compute a weighted score
#          from the priority list. Accounts that failed exactly one threshold
#          within the 20% margin (or for binary signals, simply missing one)
#          are persisted as `near_miss`.
#
# Persistence: each call truncates the position's existing matches before
# re-inserting. Treat `position_matches` as a cache per position — never as
# an immutable history.
#
# Telemetry sources (spec section 9, with `languages` removed):
#   ecosystems  →  bundle.bundle_data.payload.l1.ecosystems    (keys with true)
#   test_ratio  →  bundle.bundle_data.payload.l1.avg_test_ratio × 100
#   recency     →  Time.current - bundle.last_bundle_at  (days, float)
#
# Stop conditions enforced inline:
#   - score is clamped to [0.0, 100.0] before persistence
#   - near-miss margin formula refuses negative thresholds (would divide by 0)
#   - ecosystems signal-score is binary (the only sane reading of "presença/ausência")

module Positions
  class Matcher
    NEAR_MISS_NUMERIC_MARGIN = 0.20   # 20% below numeric threshold

    # Public entry point. Returns the persisted PositionMatch rows.
    def self.calculate!(position, now: Time.current)
      return [] unless position.matching_enabled?

      thresholds = position.thresholds.to_a
      thresholds_by_signal = thresholds.index_by(&:signal)
      priorities = position.priorities.order(:ranking).to_a

      results = candidate_accounts.find_each.filter_map do |account|
        evaluate(account, thresholds, thresholds_by_signal, priorities)
      end

      persist!(position, results, now)
    end

    # Devs that opted into /directory and have at least one active+visible
    # bundle. The matching only considers each dev's most recent visible
    # bundle (signals taken from there) — historical bundles drive the
    # evolution curve, computed separately.
    def self.candidate_accounts
      Account
        .where(directory: true)
        .joins(:bundles)
        .where(bundles: { revoked_at: nil, visible: true })
        .distinct
    end

    # Evaluate one account against the position. Returns a result hash for
    # match/near_miss, or nil if the dev is dropped (2+ failures, or no
    # eligible bundle).
    def self.evaluate(account, thresholds, thresholds_by_signal, priorities)
      bundle = latest_eligible_bundle(account)
      return nil unless bundle

      signals  = extract_signals(bundle)
      failures = thresholds.reject { |t| passes?(t, signals) }

      if failures.empty?
        score = compute_score(signals, thresholds_by_signal, priorities)
        { account_id: account.id, match_type: "match", score: score, failed_signal: nil }
      elsif failures.size == 1 && near_miss_eligible?(failures.first, signals)
        # Spec wording: "near-miss" still surfaces a score that reflects how
        # the other signals scored — the failed signal contributes 0.
        score = compute_score(signals, thresholds_by_signal, priorities,
                              exclude: failures.first.signal)
        { account_id: account.id, match_type: "near_miss",
          score: score, failed_signal: failures.first.signal }
      end
    end

    def self.latest_eligible_bundle(account)
      account.bundles.active.where(visible: true).order(:last_bundle_at).last
    end

    # ── signal extraction ──────────────────────────────────────────────────

    def self.extract_signals(bundle)
      data = bundle.bundle_data || {}

      eco_hash = data.dig("payload", "l1", "ecosystems")
      ecos =
        if eco_hash.is_a?(Hash)
          eco_hash.select { |_, v| v == true || v == "true" }.keys.map { |k| k.to_s.downcase }
        else
          []
        end

      ratio    = data.dig("payload", "l1", "avg_test_ratio")
      test_pct = ratio ? (ratio.to_f * 100).round(1) : 0.0

      days_since =
        if bundle.last_bundle_at
          ((Time.current - bundle.last_bundle_at) / 86_400.0).round(1)
        end

      { ecosystems: ecos, test_ratio: test_pct, recency: days_since }
    end

    # ── threshold evaluation ──────────────────────────────────────────────

    def self.passes?(threshold, signals)
      case threshold.signal
      when "ecosystems"
        wanted = threshold.items.map { |i| i.to_s.downcase }
        return true if wanted.empty?
        wanted.all? { |w| signals[:ecosystems].include?(w) }
      when "test_ratio"
        signals[:test_ratio] >= threshold.number
      when "recency"
        signals[:recency].present? && signals[:recency] <= threshold.number
      else
        false
      end
    end

    # Near-miss eligibility, per spec section 4:
    #   - binary signals (ecosystems): missing exactly one required item → eligible
    #   - numeric signals: dev value within 20% (below/above) the threshold
    def self.near_miss_eligible?(threshold, signals)
      case threshold.signal
      when "ecosystems"
        # "1 falha" no contador já garantiu que só um threshold falhou;
        # spec não impõe margem extra para binário.
        true
      when "test_ratio"
        return false if threshold.number <= 0
        gap = (threshold.number - signals[:test_ratio]) / threshold.number
        gap.positive? && gap <= NEAR_MISS_NUMERIC_MARGIN
      when "recency"
        return false if threshold.number <= 0 || signals[:recency].nil?
        gap = (signals[:recency] - threshold.number) / threshold.number
        gap.positive? && gap <= NEAR_MISS_NUMERIC_MARGIN
      else
        false
      end
    end

    # ── score (spec section 3, formula per signal) ────────────────────────

    def self.compute_score(signals, thresholds_by_signal, priorities, exclude: nil)
      total = 0.0
      priorities.each do |pri|
        next if pri.signal == exclude
        threshold = thresholds_by_signal[pri.signal]
        next unless threshold   # signal in priority but no threshold → skip
        signal_score = score_for_signal(pri.signal, signals, threshold)
        total += signal_score * pri.weight.to_f
      end
      total.clamp(0.0, 100.0).round(2)
    end

    def self.score_for_signal(signal, signals, threshold)
      case signal
      when "ecosystems"
        wanted = threshold.items.map { |i| i.to_s.downcase }
        # Binary: 100% se TODOS os items obrigatórios estão presentes; 0% caso contrário.
        wanted.all? { |w| signals[:ecosystems].include?(w) } ? 100.0 : 0.0
      when "test_ratio"
        return 0.0 if threshold.number <= 0
        [signals[:test_ratio] / threshold.number, 1.0].min * 100.0
      when "recency"
        return 0.0 if threshold.number <= 0 || signals[:recency].nil?
        [0.0, 1.0 - (signals[:recency] / threshold.number)].max * 100.0
      else
        0.0
      end
    end

    # ── persistence ──────────────────────────────────────────────────────

    def self.persist!(position, results, now)
      PositionMatch.transaction do
        position.matches.delete_all
        rows = results.map do |r|
          PositionMatch.create!(
            position:      position,
            account_id:    r[:account_id],
            match_type:    r[:match_type],
            score:         r[:score],
            failed_signal: r[:failed_signal],
            calculated_at: now,
          )
        end
        # `delete_all` followed by direct `PositionMatch.create!` leaves the
        # `position.matches` association cache in a stale-empty state. Subsequent
        # `position.matches.pluck(...)` would iterate the (empty) in-memory
        # collection instead of querying the DB. Reset so callers see truth.
        position.matches.reset
        rows
      end
    end
  end
end
