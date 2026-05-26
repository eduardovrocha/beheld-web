require "rails_helper"

RSpec.describe ContactMailer, type: :mailer do
  let(:account) do
    create(:account,
           email_contact:  "dev@example.com",
           phone_contact:  "+5511999990000",
           email_recovery: "MUST-NOT-LEAK@example.com")
  end
  let(:company) { create(:company, name: "Acme", email: "hr@acme.example") }
  let(:message) { create(:message, account: account, company: company) }

  describe ".respond" do
    subject(:mail) { described_class.respond(message, account, company).deliver_now }

    it "is addressed to the company's email" do
      expect(mail.to).to eq([company.email])
    end

    it "has a subject that names the dev's public handle and beheld" do
      expect(mail.subject).to include(account.display_handle)
      expect(mail.subject).to include("beheld")
    end

    it "shares email_contact + phone_contact in the text body" do
      text = mail.text_part.body.to_s
      expect(text).to include("dev@example.com")
      expect(text).to include("+5511999990000")
    end

    it "shares email_contact + phone_contact in the HTML body" do
      html = mail.html_part.body.to_s
      expect(html).to include("dev@example.com")
      expect(html).to include("+5511999990000")
    end

    it "never includes the dev's email_recovery (private to the dashboard)" do
      text = mail.text_part.body.to_s
      html = mail.html_part.body.to_s
      expect(text).not_to include("MUST-NOT-LEAK@example.com")
      expect(html).not_to include("MUST-NOT-LEAK@example.com")
    end

    it "uses the fixed system body — sober tone, no celebration" do
      text = mail.text_part.body.to_s
      expect(text).to include("tem interesse na sua mensagem.")
      expect(text).to include("forever free for developers")
      # No exclamation marks, no celebratory phrasing.
      expect(text).not_to include("!")
      %w[Parabéns Procurado Congratulations 🎉].each do |word|
        expect(text).not_to include(word)
      end
    end

    it "deposits one message in the test delivery queue" do
      expect { mail }.to change(ActionMailer::Base.deliveries, :count).by(1)
    end
  end
end
