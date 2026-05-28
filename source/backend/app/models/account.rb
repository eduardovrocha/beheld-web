# Persistent dev profile owned by a single Ed25519 keypair (its `fingerprint`).
#
# Distinct from `Attestation` — an attestation is the one-shot crypto proof
# that bound a fingerprint to a GitHub identity. An Account is the long-lived
# portal-side record (contact details, directory opt-in, watch settings) that
# survives across re-attestations.

class Account < ApplicationRecord
  belongs_to :attestation, optional: true

  has_many :bundles, dependent: :restrict_with_exception
  has_many :messages, dependent: :restrict_with_exception
  has_many :dev_sessions, dependent: :destroy
  has_many :saved_devs, dependent: :destroy

  validates :fingerprint, presence: true, uniqueness: true

  # Latest published bundle's status, with a synthetic :no_bundle terminal
  # state for accounts that have never published.
  def bundle_status
    return :no_bundle unless bundles.active.any?
    bundles.active.last.status
  end

  # The dev's contact details are only shown to a company after they click
  # "Responder" on an inbound message. This guard mirrors the dashboard's
  # "complete your profile" check before that flow is allowed to run.
  def contact_configured?
    email_contact.present? && phone_contact.present?
  end

  # Public-facing handle, in order of preference:
  #   1. `@<login>` from the canonical Attestation row, if one was linked
  #      via the GitHub OAuth flow.
  #   2. `@<login>` from the latest active bundle's signed payload — the
  #      `.dpbundle` carries the dev's attestation alongside, and the
  #      bundle signature already vouched for the wrapper. Convenient
  #      shortcut so a dev who ran `beheld attest` + `beheld share` gets
  #      the right handle without us also storing the attestation server-
  #      side. Verification of the embedded attestation is browser-side
  #      (snapshot-html.ts) and at publish time we trust the bundle sig.
  #   3. `@dev-<fingerprint>` fallback when neither identity is bound — sempre
  #      prefixado com `@` para tratar o stub anônimo como um handle de
  #      primeira classe na UI.
  #
  # Never returns the dev's contact email or recovery email.
  def display_handle
    login = attestation&.github_login.presence || latest_bundle_github_login
    login ? "@#{login}" : "@dev-#{fingerprint.first(8)}"
  end

  # Alias used by company-facing endpoints (PP12). Same semantics —
  # readable name when we have one, opaque fingerprint stub otherwise.
  alias_method :handle_or_fingerprint, :display_handle

  private

  def latest_bundle_github_login
    bundles
      .active
      .order(:last_bundle_at)
      .last
      &.bundle_data
      &.dig("attestation", "payload", "github", "login")
      &.presence
  end
end
