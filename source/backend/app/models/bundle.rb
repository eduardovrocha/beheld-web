# Published profile bundle attached to an Account. The portal exposes this
# at `/v/:url_slug`. The CLI-uploaded snapshot (a `Snapshot` row) is the raw
# .dpbundle; a Bundle is the account-bound *publication* of one or more of
# those snapshots.

class Bundle < ApplicationRecord
  OUTDATED_THRESHOLD = 30.days

  belongs_to :account
  has_many :verifications, dependent: :restrict_with_exception

  validates :url_slug, presence: true, uniqueness: true
  validates :bundle_data, presence: true

  scope :active,     -> { where(revoked_at: nil) }
  scope :visible,    -> { where(revoked_at: nil, visible: true) }
  scope :by_account, ->(account_id) { where(account_id: account_id) }

  def revoked?
    revoked_at.present?
  end

  # Tri-state status used by both the public profile page and the dashboard.
  # Revocation wins over freshness — a revoked bundle stays :revoked even if
  # last_bundle_at is fresh.
  def status
    return :revoked  if revoked_at.present?
    return :outdated if last_bundle_at < OUTDATED_THRESHOLD.ago
    :verified
  end
end
