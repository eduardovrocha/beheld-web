require "rails_helper"

RSpec.describe CompanyMailer, type: :mailer do
  describe ".magic_link" do
    let(:company) { create(:company, name: "Acme Corp", email: "hr@acme.example") }
    let(:token)   { "x" * 64 }
    let(:mail)    { described_class.magic_link(company, token).deliver_now }

    it "is addressed to the company's email" do
      expect(mail.to).to eq([company.email])
    end

    it "uses the brand subject line" do
      expect(mail.subject).to eq("Seu link de acesso ao beheld")
    end

    it "embeds the verify URL with the given token in the HTML body" do
      expect(mail.html_part.body.to_s).to include("/sessions/company/verify?token=#{token}")
    end

    it "embeds the verify URL with the given token in the text body" do
      expect(mail.text_part.body.to_s).to include("/sessions/company/verify?token=#{token}")
    end

    it "mentions the 30-minute TTL and one-shot warning in the text body" do
      expect(mail.text_part.body.to_s).to include("30 minutos")
      expect(mail.text_part.body.to_s).to match(/uma vez/i)
    end

    it "deposits the message into the test delivery queue" do
      expect {
        described_class.magic_link(company, token).deliver_now
      }.to change(ActionMailer::Base.deliveries, :count).by(1)
    end
  end
end
