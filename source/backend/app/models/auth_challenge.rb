# Single-use challenge issued by `POST /api/v1/auth/challenge` and redeemed
# by `POST /api/v1/auth/verify`. The CLI signs the nonce with the dev's
# private Ed25519 key; the portal verifies the signature against the public
# key recorded on the Account.

class AuthChallenge < ApplicationRecord
  TTL = 5.minutes

  validates :nonce,       presence: true, uniqueness: true
  validates :fingerprint, presence: true
  validates :expires_at,  presence: true

  scope :live, -> { where("expires_at > ?", Time.current).where(used_at: nil) }

  def expired?
    expires_at < Time.current
  end

  def used?
    used_at.present?
  end

  def redeemable?
    !expired? && !used?
  end

  def mark_used!
    update!(used_at: Time.current)
  end
end
