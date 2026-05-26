# One-shot, time-bound login token emailed to a company. Treated as both
# expired and burned the moment it's claimed — see `usable?`.

class MagicLink < ApplicationRecord
  belongs_to :company

  validates :token,      presence: true, uniqueness: true
  validates :expires_at, presence: true

  def expired?
    expires_at < Time.current
  end

  def used?
    used_at.present?
  end

  def usable?
    !expired? && !used?
  end
end
