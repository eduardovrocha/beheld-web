# Disparado pelo callback `Position#notify_if_just_expired` quando a row
# transita `active` → `expired`. Mantém o envio fora do request cycle
# (lazy-expire roda na controller#index do recrutador; não queremos atrasar
# a renderização da lista por causa de SMTP).

class ExpiredPositionNotificationJob < ApplicationJob
  queue_as :default

  def perform(position_id)
    position = Position.find_by(id: position_id)
    return unless position
    return unless position.status == "expired"
    return if position.company&.email.blank?

    PositionMailer.expired(position).deliver_later
  end
end
