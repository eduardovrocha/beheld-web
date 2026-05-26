# Fan-out for the "your bundle was verified" event.
#
# Dispatch rules (all three must hold or we return early):
#   1. The Verification has a company attached (anonymous uploads → no
#      notification fires).
#   2. The dev opted into watch notifications.
#   3. The Account behind the bundle exists — required by 1 above when the
#      Verification was created.
#
# Side effects, in order, each gated on the dev's preferences:
#   • Portal — already covered by the Verification row itself; the dashboard
#     reads `account.bundles.verifications` directly. No action here.
#   • Email — when `account.notification_email` is set.
#   • Webhook — when `account.notification_webhook` is set. Enqueued as a
#     separate `WebhookJob` so a slow/down endpoint can't stall the mailer.

class NotificationJob < ApplicationJob
  queue_as :default

  def perform(verification_id)
    verification = Verification.find_by(id: verification_id)
    return if verification.nil?

    company = verification.company
    return if company.nil?

    account = verification.bundle&.account
    return if account.nil?
    return unless account.watch?

    if account.notification_email.present?
      NotificationMailer.verification_received(account, verification).deliver_later
    end

    if account.notification_webhook.present?
      WebhookJob.perform_later(account.notification_webhook, {
        event:       "bundle_verified",
        company:     company.name,
        job_title:   verification.job_title,
        area:        verification.area,
        verified_at: verification.verified_at.iso8601,
      })
    end
  end
end
