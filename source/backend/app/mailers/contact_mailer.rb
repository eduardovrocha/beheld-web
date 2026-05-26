# Hand-off email — dev's contact details, sent to the recruiter who opened
# the conversation. The body is a fixed system message; the dev does NOT
# write it.
#
# Privacy invariant: only `email_contact` + `phone_contact` appear in the
# rendered body. `email_recovery` is never read or referenced here.

class ContactMailer < ApplicationMailer
  default from: ENV.fetch("BEHELD_MAIL_FROM", "no-reply@beheld.dev")

  def respond(message, account, company)
    @message = message
    @account = account
    @company = company
    @handle  = account.display_handle

    mail(
      to:      company.email,
      subject: "Resposta de #{@handle} via beheld",
    )
  end
end
