# Persisted result of the matching engine. The matching service truncates
# all rows for a position before re-inserting, so treat these as a cache
# (per-position scoreboard), not a historical log.
#
# `match_type`:
#   "match"     → dev passed every threshold; score reflects the weighted
#                 formula from the spec (0..100).
#   "near_miss" → dev failed exactly one threshold within the 20% margin;
#                 `failed_signal` names which one for the UI.

class PositionMatch < ApplicationRecord
  MATCH_TYPES = %w[match near_miss].freeze

  belongs_to :position
  belongs_to :account

  validates :score,         presence: true, numericality: { in: 0.0..100.0 }
  validates :match_type,    presence: true, inclusion: { in: MATCH_TYPES }
  validates :calculated_at, presence: true
  validate  :failed_signal_only_for_near_miss

  scope :matches,   -> { where(match_type: "match")     }
  scope :near_miss, -> { where(match_type: "near_miss") }
  scope :ranked,    -> { order(score: :desc, account_id: :asc) }

  private

  def failed_signal_only_for_near_miss
    return if match_type == "near_miss" || failed_signal.blank?
    errors.add(:failed_signal, "só pode ser preenchido para match_type 'near_miss'")
  end
end
