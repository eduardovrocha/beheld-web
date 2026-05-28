require "rails_helper"

RSpec.describe PositionMailer, type: :mailer do
  let(:company)  { Company.create!(name: "Acme", email: "ops@acme.test") }
  let(:position) { company.positions.create!(title: "Senior Backend", status: "expired") }

  describe "#expired" do
    let(:mail) { described_class.expired(position) }

    it "envia para o email da empresa" do
      expect(mail.to).to eq([company.email])
    end

    it "tem assunto com o título da vaga" do
      expect(mail.subject).to include("Vaga expirada")
      expect(mail.subject).to include(position.title)
    end

    it "linka para o dashboard da empresa" do
      expect(mail.body.encoded).to include("beheld.dev/company/dashboard")
    end

    it "NÃO usa linguagem alarmista" do
      body = mail.body.encoded.downcase
      forbidden = %w[penalidade urgente obrigatório perdeu suspenso atenção]
      forbidden.each do |word|
        expect(body).not_to include(word), "encontrou '#{word}' no corpo do email"
      end
    end
  end
end
