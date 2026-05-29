# Dev-facing notifications. Currently a single template:
# `verification_received`, sent when a logged-in recruiter uploads the
# dev's .dpbundle on /verify.
#
# Tone is witness, not cheerleader — no exclamation marks, no "Parabéns",
# no "Você está sendo procurado". Facts only.

class NotificationMailer < ApplicationMailer
  default from: ENV.fetch("BEHELD_MAIL_FROM", "no-reply@beheld.dev")

  def verification_received(account, verification)
    @account      = account
    @verification = verification
    @company      = verification.company

    mail(
      to:      account.notification_email,
      subject: I18n.t("mailers.notification.verification_received.subject"),
    )
  end
end
