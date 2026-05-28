# Recruiter-owned job posting. Visible only inside the company that owns
# it (the wire-format /v/:slug payload never leaks position rows).

class Position < ApplicationRecord
  STATUSES                  = %w[active expired closed].freeze
  ACTIVATION_WINDOW         = 30.days
  ACTIVE_RANKING_RANGE      = (1..4).freeze

  belongs_to :company
  has_many :thresholds, class_name: "PositionThreshold", dependent: :destroy
  has_many :priorities, class_name: "PositionPriority",  dependent: :destroy
  has_many :matches,    class_name: "PositionMatch",     dependent: :destroy

  validates :status, presence: true, inclusion: { in: STATUSES }

  scope :active,  -> { where(status: "active") }
  scope :expired, -> { where(status: "expired") }
  scope :closed,  -> { where(status: "closed") }

  # P20.1 — disparado uma única vez quando a row transita active → expired
  # (lazy expire ou expire! explícito). O job é responsável por checar se
  # a empresa tem email cadastrado antes de enfileirar o mailer.
  after_update :notify_if_just_expired, if: :saved_change_to_status?

  private

  def notify_if_just_expired
    return unless status == "expired"
    ExpiredPositionNotificationJob.perform_later(id)
  end

  public

  # Initial activation — called when the recruiter creates (or reactivates)
  # a position. Sets the 30-day clock. Idempotent: a no-op if already
  # active with a future expires_at.
  #
  # P20.3: reativação reinicia o contador e zera o archived_at. Histórico
  # de matches já persistidos é preservado — o motor é re-rodado pelo
  # controller que chamou activate!, então os matches refletirão o estado
  # atual do diretório.
  def activate!(now: Time.current)
    return if status == "active" && expires_at && expires_at > now
    update!(
      status:       "active",
      activated_at: now,
      expires_at:   now + ACTIVATION_WINDOW,
      archived_at:  nil,
    )
  end

  # P20.1: lazy expiration. Called by the controller on read — flips
  # `status` to "expired" if the 30-day window passed without explicit
  # reactivation. Avoids needing a Sidekiq cron for now; the cost is one
  # write per position per read (only when actually expiring).
  def expire_if_due!(now: Time.current)
    return unless status == "active" && expires_at && expires_at <= now
    update!(status: "expired")
  end

  # Force the expired transition regardless of the 30-day window (used by
  # tests + admin paths that need to manually expire a position). Spec
  # nomenclature alias: `position.expire!`.
  def expire!
    update!(status: "expired")
  end

  # Spec nomenclature alias for `activate!`. Semantically distinct from
  # the first activation (`activate!` is also called by the create flow)
  # but the effect is identical: reset clock, status → active, archived_at
  # → nil. Matches the spec's "Reativação reinicia o contador de 30 dias".
  def reactivate!(now: Time.current)
    activate!(now: now)
  end

  def close!(now: Time.current)
    update!(status: "closed", archived_at: archived_at || now)
  end

  def matching_enabled?
    thresholds.any?
  end

  # Canonical keys for the structured description sections. The SPA's
  # markdown importer parses an uploaded .md and tries to slot the headings
  # into these five buckets. Free to leave any block empty.
  SECTION_KEYS = %w[responsibilities technical_stack requirements qualifications nice_to_have].freeze

  validates :title, presence: true, length: { maximum: 160 }
  validates :description, length: { maximum: 4000 }, allow_blank: true

  # Sanity cap so a runaway POST can't bloat the row. Recruiters realistically
  # tag 5-20 techs per posting; 60 leaves comfortable headroom.
  validate :technologies_shape
  validate :sections_shape
  validate :location_shape

  # location is a jsonb hierarchy: { region, country, state, city } for the
  # structured picker, or { raw } for rows migrated from the old free-text
  # column. Empty hash means "no location". We only accept the canonical keys
  # with short string values so a malformed POST can't bloat or poison the row.
  LOCATION_KEYS = %w[region country state city raw].freeze

  # Coerce legacy/bare values so callers that still assign a plain string
  # (seeds, console, old code paths) don't trip location_shape: a non-empty
  # string becomes { raw: ... }, and nil/"" becomes {}.
  before_validation :normalize_location

  def normalize_location
    case location
    when String then self.location = location.strip.empty? ? {} : { "raw" => location }
    when nil    then self.location = {}
    end
  end

  def location_shape
    return if location.is_a?(Hash) &&
              location.keys.all?   { |k| LOCATION_KEYS.include?(k.to_s) } &&
              location.values.all? { |v| v.nil? || (v.is_a?(String) && v.size <= 120) }
    errors.add(:location, "deve ser um objeto com chaves #{LOCATION_KEYS.join(', ')} e valores de até 120 caracteres")
  end

  def technologies_shape
    return if technologies.is_a?(Array) && technologies.size <= 60 &&
              technologies.all? { |t| t.is_a?(String) && t.size <= 60 }
    errors.add(:technologies, "deve ser uma lista com até 60 strings de no máximo 60 caracteres")
  end

  def sections_shape
    return if sections.is_a?(Hash) &&
              sections.keys.all?   { |k| SECTION_KEYS.include?(k.to_s) } &&
              sections.values.all? { |v| v.nil? || (v.is_a?(String) && v.size <= 8000) }
    errors.add(:sections, "deve usar apenas as chaves #{SECTION_KEYS.join(', ')} com valores de até 8000 caracteres")
  end

  scope :active,   -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }

  def archived?
    archived_at.present?
  end
end
