class ApplicationMailer < ActionMailer::Base
  # MAIL_FROM define o remetente em todos os mailers. Em dev cai em um
  # endereco @beheld.test para deixar claro no Mailtrap que veio do sandbox.
  # Em prod, /etc/beheld/app.env deve setar o valor real (ex.:
  # "beheld <noreply@beheld.dev>").
  default from: ENV.fetch("MAIL_FROM", "beheld <noreply@beheld.test>")
  layout "mailer"
end
