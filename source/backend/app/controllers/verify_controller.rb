# Recruiter upload entry point. Anyone (with or without a Company session)
# can drop a .dpbundle into the form. Cryptographic verification happens in
# the browser — this controller only renders the bundle data and lets the
# Web Crypto API decide whether the page reveals it.
#
# Persistence rule: a Verification row is created only when (a) a recruiter
# is logged in via the company magic-link session AND (b) the bundle's
# fingerprint matches an existing, non-revoked Bundle row.

class VerifyController < ActionController::Base
  layout "public"
  protect_from_forgery with: :exception

  before_action :load_current_company

  def index
    @company_logged_in = @current_company.present?
  end

  def create
    file = params[:bundle_file]
    if file.blank?
      flash.now[:alert] = "Selecione um arquivo .dpbundle."
      @company_logged_in = @current_company.present?
      return render :index, status: :unprocessable_entity
    end

    @bundle_data = parse_bundle(file)
    if @bundle_data.nil?
      flash.now[:alert] = "Arquivo inválido — não foi possível ler o bundle."
      @company_logged_in = @current_company.present?
      return render :index, status: :unprocessable_entity
    end

    @fingerprint = fingerprint_from(@bundle_data["public_key"])
    @account     = Account.find_by(fingerprint: @fingerprint) if @fingerprint
    @bundle      = lookup_bundle(@fingerprint)

    persist_verification if @current_company && @bundle

    render :result
  end

  private

  def load_current_company
    company_id = cookies.signed[CompanyAuthenticated::COOKIE_NAME]
    @current_company = Company.find_by(id: company_id) if company_id.present?
  end

  def parse_bundle(file)
    raw = file.read
    parsed = JSON.parse(raw)
    return nil unless parsed.is_a?(Hash) && parsed["payload"].is_a?(Hash)
    return nil unless parsed["signature"].is_a?(String) && parsed["public_key"].is_a?(String)
    parsed
  rescue JSON::ParserError, IOError
    nil
  end

  # `ed25519:<base64url-x>` → raw hex. Mirrors the CLI's `publicKeyHex` so
  # the fingerprint we look up here is byte-identical to what the publish
  # endpoint stored on the Account row.
  def fingerprint_from(public_key)
    return nil unless public_key.is_a?(String)
    raw = public_key.sub(/\Aed25519:/, "")
    decoded = Base64.urlsafe_decode64(raw)
    decoded.unpack1("H*")
  rescue ArgumentError
    nil
  end

  def lookup_bundle(fingerprint)
    return nil if fingerprint.blank?
    account = Account.find_by(fingerprint: fingerprint)
    account&.bundles&.active&.first
  end

  def persist_verification
    verification = Verification.create!(
      bundle:      @bundle,
      company:     @current_company,
      job_title:   params[:job_title].presence,
      area:        params[:area].presence,
      verified_at: Time.current,
    )
    NotificationJob.perform_later(verification.id)
  end
end
