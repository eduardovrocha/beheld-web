class Install < ApplicationRecord
  # Cross-repo install counter (B3H31D).
  # Schema: id (uuid PK, client-generated), os, version, timestamps.
  # Privacy: nada além dos 3 campos do schema. Não rastreamos uninstall —
  # contador é monotônico crescente, honesto sobre o que mede.
  VALID_OS = %w[macos linux].freeze
  VALID_VERSION_REGEX = /\A\d+\.\d+\.\d+/.freeze

  validates :id, presence: true
  validates :os, presence: true, inclusion: { in: VALID_OS }
  validates :version, presence: true, format: { with: VALID_VERSION_REGEX }
end
