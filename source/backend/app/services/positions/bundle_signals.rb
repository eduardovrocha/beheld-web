# Canonical, typed view of the matchable signals in a bundle.
#
# The matching engine and the evolution curve consume THIS — never the raw
# `bundle_data` hash. All schema-version handling lives in one place, with
# explicit fields and fixed units:
#
#   ecosystems    → Array<String>   nomes em minúsculas (lista de presença)
#   test_ratio    → Float (0..100)  percentual
#   recency_days  → Integer | nil   dias desde a última publicação
#
# Princípio: nenhum número opaco vira chave ou atributo. O retrato público
# guarda `payload.signals.ecosystems` como arrays categorizados (dominant/
# secondary/…) e `payload.scores.*` como índices derivados — mas isso é
# camada de APRESENTAÇÃO. O matching usa a camada ESTRUTURADA, onde
# ecosystems é presença booleana e avg_test_ratio é a proporção real.
#
# R1.3 — a camada estruturada agora vive em `payload.core` (BUNDLE_VERSION
# 6 e 7). Bundles legacy continuam em `payload.l1`. A regra de fallback
# (core → l1 → vazio) está centralizada aqui via CORE_PATHS / LEGACY_PATHS;
# qualquer outro consumidor de bundle no Rails fala com os três campos
# tipados acima e fica imune ao wire schema.

module Positions
  class BundleSignals
    # R1.3 — try the v3 (core/enrichment) path first; fall back to the
    # legacy v2 (l1/l2) path. The first non-Hash returned by Hash#dig is
    # treated as absent (yielding the default empty / 0.0 result).
    CORE_ECOSYSTEMS_PATH    = %w[payload core ecosystems].freeze
    CORE_TEST_RATIO_PATH    = %w[payload core avg_test_ratio].freeze
    LEGACY_ECOSYSTEMS_PATH  = %w[payload l1 ecosystems].freeze
    LEGACY_TEST_RATIO_PATH  = %w[payload l1 avg_test_ratio].freeze

    # Kept as constant aliases for any external reader that imported the
    # pre-R1.3 names. New code should reference the CORE_* / LEGACY_*
    # constants above.
    ECOSYSTEMS_PATH = CORE_ECOSYSTEMS_PATH
    TEST_RATIO_PATH = CORE_TEST_RATIO_PATH

    SIGNALS = %w[ecosystems test_ratio recency].freeze

    attr_reader :ecosystems, :test_ratio, :recency_days

    # Build from a Bundle row. Returns a frozen value object.
    def self.from(bundle)
      new(bundle)
    end

    def initialize(bundle)
      data          = bundle&.bundle_data || {}
      @ecosystems   = normalize_ecosystems(data)
      @test_ratio   = normalize_test_ratio(data)
      @recency_days = normalize_recency(bundle)
      freeze
    end

    # Uniform accessor used by the matcher's threshold/score loops, keyed by
    # the canonical signal name. Returns the typed value or nil.
    def value_for(signal)
      case signal.to_s
      when "ecosystems" then ecosystems
      when "test_ratio" then test_ratio
      when "recency"    then recency_days
      end
    end

    # Back-compat shape for callers that still expect a hash. Keeps the
    # keys explicit and typed — no schema sniffing downstream.
    def to_h
      { ecosystems: ecosystems, test_ratio: test_ratio, recency: recency_days }
    end

    private

    # R1.3 fallback chain: payload.core.ecosystems → payload.l1.ecosystems.
    # `payload.core.ecosystems` → { "rails" => true, "python" => false }
    # Presença = valor booleano verdadeiro. Saída: ["rails"].
    def normalize_ecosystems(data)
      raw = safe_dig(data, CORE_ECOSYSTEMS_PATH) || safe_dig(data, LEGACY_ECOSYSTEMS_PATH)
      return [] unless raw.is_a?(Hash)
      raw.select { |_, present| present == true || present == "true" }
         .keys
         .map { |k| k.to_s.downcase }
    end

    # R1.3 fallback chain: payload.core.avg_test_ratio → payload.l1.avg_test_ratio.
    # 0.42 (proporção 0–1) → 42.0 (percentual). Ausente ou não-numérico →
    # 0.0 (dev sem sinal de teste pontua zero, nunca quebra o cálculo).
    def normalize_test_ratio(data)
      raw = safe_dig(data, CORE_TEST_RATIO_PATH)
      raw = safe_dig(data, LEGACY_TEST_RATIO_PATH) unless raw.is_a?(Numeric)
      return 0.0 unless raw.is_a?(Numeric)
      (raw.to_f * 100).round(1)
    end

    # Walks `path` defensively. Ruby's `Hash#dig` raises `TypeError` once the
    # walk reaches a non-Hash intermediate value (e.g. `payload.core` is a
    # string). Fallback-chain semantics need that branch to behave like "no
    # data here, keep looking", so we step through the keys manually and
    # bail to nil the moment we leave Hash-land.
    def safe_dig(node, path)
      path.each do |key|
        return nil unless node.is_a?(Hash)
        node = node[key]
      end
      node
    end

    # Dias inteiros desde `last_bundle_at` (campo de banco, não bundle_data).
    def normalize_recency(bundle)
      return nil unless bundle&.last_bundle_at
      ((Time.current - bundle.last_bundle_at) / 86_400.0).floor
    end
  end
end
