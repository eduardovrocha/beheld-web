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
# camada de APRESENTAÇÃO. O matching usa a camada ESTRUTURADA `payload.l1`,
# onde ecosystems é presença booleana e avg_test_ratio é a proporção real.
#
# Se um dia a fonte estrutural mudar, este é o único arquivo a tocar — o
# resto do sistema fala com os três campos tipados acima.

module Positions
  class BundleSignals
    ECOSYSTEMS_PATH = %w[payload l1 ecosystems].freeze
    TEST_RATIO_PATH = %w[payload l1 avg_test_ratio].freeze

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

    # `payload.l1.ecosystems` → { "rails" => true, "python" => false }
    # Presença = valor booleano verdadeiro. Saída: ["rails"].
    def normalize_ecosystems(data)
      raw = data.dig(*ECOSYSTEMS_PATH)
      return [] unless raw.is_a?(Hash)
      raw.select { |_, present| present == true || present == "true" }
         .keys
         .map { |k| k.to_s.downcase }
    end

    # `payload.l1.avg_test_ratio` → 0.42 (proporção 0–1) → 42.0 (percentual).
    # Ausente ou não-numérico → 0.0 (dev sem sinal de teste pontua zero,
    # nunca quebra o cálculo).
    def normalize_test_ratio(data)
      raw = data.dig(*TEST_RATIO_PATH)
      return 0.0 unless raw.is_a?(Numeric)
      (raw.to_f * 100).round(1)
    end

    # Dias inteiros desde `last_bundle_at` (campo de banco, não bundle_data).
    def normalize_recency(bundle)
      return nil unless bundle&.last_bundle_at
      ((Time.current - bundle.last_bundle_at) / 86_400.0).floor
    end
  end
end
