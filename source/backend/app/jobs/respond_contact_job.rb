# Dispatched when a dev clicks "Responder" on an inbound Message. Hands the
# work to ContactMailer which forwards the dev's contact details to the
# company that opened the conversation. No-op when the message's account
# doesn't have contact details configured (the dashboard already 422s in
# that case, so this is defense in depth).

class RespondContactJob < ApplicationJob
  queue_as :default

  def perform(message_id)
    message = Message.find_by(id: message_id)
    return if message.nil?

    account = message.account
    company = message.company
    return if account.nil? || company.nil?
    return unless account.contact_configured?

    ContactMailer.respond(message, account, company).deliver_now
  end
end
