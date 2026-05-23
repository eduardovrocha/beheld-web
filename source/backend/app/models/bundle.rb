# Stored .dpbundle (Phase 5 / F5.4-5; Phase 6 / F6.8 retrocompat).
#
# `payload` holds the entire bundle JSON as received from the CLI — including
# the signed inner payload plus the proof half (hash, signature, public_key).
# Re-verification by the browser (Web Crypto API) uses this exact bytes payload.
#
# Schema versions:
#   v1 — Phase 5. Inner payload has a `signals` hash with all signals merged.
#   v2 — Phase 6. Inner payload has `l1` (git history) and `l2` (sessions) as
#        two distinct top-level objects.
# Both are accepted; the `schema_version` column tells consumers which layout
# to render.

class Bundle < ApplicationRecord
  HASH_FORMAT       = /\Asha256:[0-9a-f]{64}\z/.freeze
  PUBKEY_FORMAT     = /\Aed25519:[A-Za-z0-9_\-]+\z/.freeze
  DEFAULT_TTL_DAYS  = 30
  SHORT_ID_BYTES    = 8 # → 11 URL-safe base64 chars (~64 bits of entropy)

  REQUIRED_INNER_FIELDS = %w[created_at beheld_version scores].freeze
  REQUIRED_SCORE_FIELDS = %w[overall prompt_quality test_maturity tech_breadth growth_rate].freeze

  validates :short_id,       presence: true, uniqueness: true
  validates :bundle_hash,    presence: true, uniqueness: true, format: { with: HASH_FORMAT }
  validates :public_key,     presence: true, format: { with: PUBKEY_FORMAT }
  validates :payload,        presence: true
  validates :schema_version, inclusion: { in: %w[v1 v2] }

  before_validation :assign_short_id, on: :create
  before_validation :assign_default_ttl, on: :create
  before_validation :assign_schema_version

  scope :live, -> { where("expires_at IS NULL OR expires_at > ?", Time.current) }

  def expired?
    expires_at.present? && expires_at < Time.current
  end

  def ttl_days_remaining
    return nil if expires_at.nil?
    [((expires_at - Time.current) / 1.day).ceil, 0].max
  end

  # ── schema detection ────────────────────────────────────────────────────

  # `payload` here is the INNER signed payload (i.e. the `payload` key of the
  # outer bundle JSON). Returns :v2, :v1, or :unknown.
  def self.schema_version(payload)
    return :unknown unless payload.is_a?(Hash)
    return :v2 if payload.key?("l1") && payload.key?("l2")
    return :v1 if payload.key?("signals")
    :unknown
  end

  # Defensive payload check used by the controller before accepting an upload.
  # Both v1 and v2 are valid — the difference is rendering only.
  def self.valid_payload?(payload)
    version = schema_version(payload)
    return false if version == :unknown
    return false unless payload.is_a?(Hash)

    return false unless REQUIRED_INNER_FIELDS.all? { |k| payload.key?(k) }

    scores = payload["scores"]
    return false unless scores.is_a?(Hash)
    return false unless REQUIRED_SCORE_FIELDS.all? { |k| scores.key?(k) }

    true
  end

  # Lightweight subset for the public profile (`/v/:id`) display — strips the
  # proof fields by default and surfaces both layered (l1+l2) and legacy
  # (signals) shapes so the renderer can pick whichever is present.
  def public_view
    inner = payload["payload"] || {}
    {
      id: short_id,
      created_at: created_at.iso8601,
      expires_at: expires_at&.iso8601,
      ttl_days_remaining: ttl_days_remaining,
      schema_version: schema_version,
      scores: inner["scores"],
      signals: inner["signals"],
      l1: inner["l1"],
      l2: inner["l2"],
      beheld_version: inner["beheld_version"],
      bundle_version: payload["version"],
    }.compact
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

  # Always recompute on every validation pass: the column has a "v1" default
  # for backward-compat with existing rows, which would otherwise mask a v2
  # payload. Detection from the live payload is the source of truth.
  def assign_schema_version
    inner = payload.is_a?(Hash) ? (payload["payload"] || payload) : {}
    version = self.class.schema_version(inner)
    # `version` is :v1, :v2, or :unknown — :unknown leaves the column nil so
    # the inclusion validation surfaces a clear error.
    self.schema_version = version == :unknown ? nil : version.to_s
  end
end
