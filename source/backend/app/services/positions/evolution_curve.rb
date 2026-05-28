# Per-signal evolution curve. Reads the dev's historical bundles in
# chronological order, extracts the value for the requested signal, and
# returns a simple {trend, delta, current, points, period_days} payload.
#
# Stop condition (spec section 11):
#   "A curva de evolução tentar calcular tendência para `ecosystems` ou
#    `recency` — apenas `test_ratio`."
#
# So only `test_ratio` has a real trend. The service refuses other signals
# explicitly — callers should treat `nil` as "no curve" and render nothing.
#
# Statuses:
#   "available" — ≥ 2 bundles, trend computed
#   "building"  — exactly 1 bundle, current value but no trend yet
#   "none"      — no eligible bundles
#   "not_applicable" — caller asked for a signal we don't track

module Positions
  class EvolutionCurve
    SUPPORTED_SIGNALS = %w[test_ratio].freeze

    def self.for(account, signal)
      return { "status" => "not_applicable" } unless SUPPORTED_SIGNALS.include?(signal)

      bundles = account.bundles.active.where(visible: true).order(:published_at).to_a
      points  = bundles.map { |b| extract(b, signal) }.compact

      return { "status" => "none" } if points.empty?

      if points.size == 1
        return {
          "status"  => "building",
          "current" => points.first,
          "points"  => 1,
        }
      end

      delta = (points.last - points.first).round(1)
      trend =
        if    delta > 0 then "up"
        elsif delta < 0 then "down"
        else  "stable"
        end
      period_days = ((bundles.last.published_at - bundles.first.published_at) / 86_400.0).round

      {
        "status"      => "available",
        "current"     => points.last,
        "delta"       => delta,
        "trend"       => trend,
        "points"      => points.size,
        "period_days" => period_days,
      }
    end

    # Usa a mesma camada de normalização do matcher para garantir que o
    # ponto da curva e o valor que entra no score sejam idênticos em unidade
    # (test_ratio sempre 0–100). `BundleSignals#test_ratio` devolve 0.0 para
    # bundles sem o sinal; aqui tratamos 0.0 como ponto válido apenas se o
    # bundle de fato carrega `avg_test_ratio` — caso contrário, nil (não
    # poluir a curva com zeros artificiais).
    def self.extract(bundle, signal)
      return nil unless signal == "test_ratio"
      raw = bundle.bundle_data&.dig("payload", "l1", "avg_test_ratio")
      return nil unless raw.is_a?(Numeric)
      BundleSignals.from(bundle).test_ratio
    end
  end
end
