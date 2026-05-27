# One row per signal that the matching engine should filter on.
#
# The `value` jsonb holds either:
#   - { "items" => ["React", "Vue"] }   for signal: "ecosystems"
#   - { "number" => 30 }                for signal: "test_ratio" / "recency"
#
# Why wrap a number in a hash: jsonb columns in Rails 7 won't store bare
# scalars on PostgreSQL — the JSON spec allows scalar root, but the column
# type's default cast wants an object. Wrapping keeps the schema honest
# without losing type info.

class PositionThreshold < ApplicationRecord
  SIGNALS   = %w[ecosystems test_ratio recency].freeze
  OPERATORS = %w[includes gte lte].freeze

  # Canonical operator per signal — passed values are validated against
  # this map so the matching engine doesn't have to second-guess.
  OPERATOR_FOR = {
    "ecosystems" => "includes",
    "test_ratio" => "gte",
    "recency"    => "lte",
  }.freeze

  belongs_to :position

  validates :signal,   presence: true, inclusion: { in: SIGNALS }
  validates :operator, presence: true, inclusion: { in: OPERATORS }
  validate  :operator_matches_signal
  validate  :value_shape_for_signal

  def items
    return [] unless signal == "ecosystems"
    Array(value["items"]).map(&:to_s)
  end

  def number
    return nil if signal == "ecosystems"
    value["number"].to_f
  end

  private

  def operator_matches_signal
    expected = OPERATOR_FOR[signal]
    return if expected.nil? || operator == expected
    errors.add(:operator, "para signal '#{signal}' deve ser '#{expected}'")
  end

  def value_shape_for_signal
    case signal
    when "ecosystems"
      list = value.is_a?(Hash) ? value["items"] : nil
      ok = list.is_a?(Array) && !list.empty? && list.all? { |s| s.is_a?(String) && s.size <= 60 }
      errors.add(:value, "deve conter `items` como lista de strings") unless ok
    when "test_ratio", "recency"
      n = value.is_a?(Hash) ? value["number"] : nil
      ok = n.is_a?(Numeric) && n >= 0
      errors.add(:value, "deve conter `number` numérico não-negativo") unless ok
    end
  end
end
