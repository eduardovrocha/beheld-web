# 24-hour bearer-token session granted to a dev after a successful
# challenge/response authentication. Presented by the CLI in the
# `Authorization: Bearer <token>` header on dashboard-API calls.

class DevSession < ApplicationRecord
  TTL = 24.hours

  belongs_to :account

  validates :token,      presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where("expires_at > ?", Time.current) }

  def expired?
    expires_at < Time.current
  end

  def revoke!
    update!(expires_at: Time.current)
  end
end
