# Recruiter-side transactional mail. Currently a single template:
# `magic_link`, the one-shot login link sent on signup and on every
# subsequent /sessions/company POST.

class CompanyMailer < ApplicationMailer
  default from: ENV.fetch("BEHELD_MAIL_FROM", "no-reply@beheld.dev")

  # Sends the login link. The CompanyMailerPreview / specs assert the
  # presence of the verify URL in both the HTML and text parts.
  def magic_link(company, token)
    @company = company
    @token   = token
    @verify_url = "#{portal_host}/sessions/company/verify?token=#{token}"
    mail(
      to:      company.email,
      subject: I18n.t("mailers.company.magic_link.subject"),
    )
  end

  private

  # Where the magic link lives. The SPA (Vite) handles /sessions/company/verify
  # — calls our /api/v1/sessions/company/verify to exchange the token for a
  # cookie. Pick the right host per environment so the URL in the email is
  # always clickable in the user's browser.
  def portal_host
    explicit = ENV["PORTAL_PUBLIC_URL"].to_s.strip
    return explicit.sub(%r{/+\z}, "") if explicit.present?
    Rails.env.production? ? "https://beheld.dev" : "http://localhost:5173"
  end
end
