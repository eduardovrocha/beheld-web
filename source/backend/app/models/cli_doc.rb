# frozen_string_literal: true

# Snapshot versionado da referência do CLI gerada por varredura do código-fonte
# em packages/cli/docs/cli-references-v<X>-<Y>-<Z>.md. Cada registro é uma
# release do binário, com markdown completo + proveniência (commit_sha,
# published_at). Servido pelos endpoints públicos /api/v1/docs/cli.

class CliDoc < ApplicationRecord
  ALLOWED_TAGS = %w[latest stable legacy].freeze

  validates :version,      presence: true, uniqueness: true
  validates :commit_sha,   presence: true
  validates :published_at, presence: true
  validates :markdown,     presence: true
  validates :checksum,     presence: true
  validates :tag, inclusion: { in: ALLOWED_TAGS }, allow_nil: true

  after_save :ensure_single_latest

  scope :ordered, -> { order(published_at: :desc) }

  def to_index_entry
    {
      version: version,
      commit_sha: commit_sha,
      published_at: published_at,
      tag: tag
    }
  end

  def cache_etag
    %(W/"#{checksum}")
  end

  # Marca o doc mais recente como latest *se* nenhum outro já carrega essa tag.
  # Idempotente: pode ser chamado a cada ingestão.
  def self.tag_latest_automatically!
    return if exists?(tag: "latest")

    newest = ordered.first
    newest&.update_column(:tag, "latest")
  end

  private

  def ensure_single_latest
    return unless tag == "latest"

    self.class.where.not(id: id).where(tag: "latest").update_all(tag: nil)
  end
end
