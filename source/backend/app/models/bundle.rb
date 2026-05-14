# Stored .dpbundle (Phase 5 / F5.4-5).
#
# `payload` holds the entire bundle JSON as received from the CLI — including
# the signed inner payload plus the proof half (hash, signature, public_key).
# Re-verification by the browser (Web Crypto API) uses this exact bytes payload.

class Bundle < ApplicationRecord
  HASH_FORMAT       = /\Asha256:[0-9a-f]{64}\z/.freeze
  PUBKEY_FORMAT     = /\Aed25519:[A-Za-z0-9_\-]+\z/.freeze
  DEFAULT_TTL_DAYS  = 30
  SHORT_ID_BYTES    = 8 # → 11 URL-safe base64 chars (~64 bits of entropy)

  validates :short_id,    presence: true, uniqueness: true
  validates :bundle_hash, presence: true, uniqueness: true, format: { with: HASH_FORMAT }
  validates :public_key,  presence: true, format: { with: PUBKEY_FORMAT }
  validates :payload,     presence: true

  before_validation :assign_short_id, on: :create
  before_validation :assign_default_ttl, on: :create

  scope :live, -> { where("expires_at IS NULL OR expires_at > ?", Time.current) }

  def expired?
    expires_at.present? && expires_at < Time.current
  end

  def ttl_days_remaining
    return nil if expires_at.nil?
    [((expires_at - Time.current) / 1.day).ceil, 0].max
  end

  # Lightweight subset for the public profile (`/v/:id`) display — strips the
  # proof fields by default, since renderers want the readable data.
  def public_view
    inner = payload["payload"] || {}
    {
      id: short_id,
      created_at: created_at.iso8601,
      expires_at: expires_at&.iso8601,
      ttl_days_remaining: ttl_days_remaining,
      scores: inner["scores"],
      signals: inner["signals"],
      devprofile_version: inner["devprofile_version"],
      bundle_version: payload["version"],
    }
  end

  private

  def assign_short_id
    return if short_id.present?
    self.short_id = loop do
      candidate = SecureRandom.urlsafe_base64(SHORT_ID_BYTES)
      break candidate unless self.class.exists?(short_id: candidate)
    end
  end

  def assign_default_ttl
    self.expires_at ||= DEFAULT_TTL_DAYS.days.from_now
  end
end
