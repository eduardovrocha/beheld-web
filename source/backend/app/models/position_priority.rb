# Per-signal priority ordering. The matching engine reads `signal + weight`
# pairs to compute the weighted score. `ranking` is the 1..4 ordinal the
# recruiter set on the form; `weight` is derived from it via WEIGHTS_BY_RANK.
#
# We auto-derive `weight` on save so the API surface only needs to accept
# `ranking` from the UI — keeps the form-state simpler and prevents the
# client from inventing weights that don't match the spec.

class PositionPriority < ApplicationRecord
  SIGNALS = PositionThreshold::SIGNALS   # match the threshold taxonomy

  WEIGHTS_BY_RANK = { 1 => 0.40, 2 => 0.30, 3 => 0.20, 4 => 0.10 }.freeze

  belongs_to :position

  validates :signal,  presence: true, inclusion: { in: SIGNALS }
  validates :ranking, presence: true, inclusion: { in: WEIGHTS_BY_RANK.keys }

  before_validation :derive_weight, on: %i[create update]

  private

  def derive_weight
    self.weight = WEIGHTS_BY_RANK[ranking] if ranking
  end
end
