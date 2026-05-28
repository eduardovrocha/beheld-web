# Recruiter-facing mailer for position lifecycle events.
#
# Tone (spec section 6 + invariant): "testemunha, não alarmista". Nenhuma
# linguagem de penalidade, urgência artificial ou perda — o email apenas
# avisa que a janela de 30 dias terminou e aponta de volta ao dashboard.

class PositionMailer < ApplicationMailer
  default from: "no-reply@beheld.dev"

  # P20 — disparado pelo ExpiredPositionNotificationJob quando uma position
  # transita de `active` → `expired`. O dashboard /company já lista vagas
  # expiradas (badge + ações), então o email é só um nudge gentil.
  def expired(position)
    @position = position
    @company  = position.company
    mail(
      to:      @company.email,
      subject: "Vaga expirada: #{@position.title}",
    )
  end
end
