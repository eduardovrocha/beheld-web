require "rails_helper"

RSpec.describe NotificationMailer, type: :mailer do
  let(:account) { create(:account, notification_email: "dev@example.com", watch: true) }
  let(:company) { create(:company, name: "Acme Corp") }
  let(:bundle)  { create(:bundle, account: account) }
  let(:verification) do
    Verification.create!(
      bundle:      bundle,
      company:     company,
      job_title:   "Senior",
      area:        "Backend",
      verified_at: Time.utc(2026, 5, 26, 12, 30),
    )
  end

  # Words that must never appear in any version of this template.
  CELEBRATORY = %w[Parabéns Parabens Procurado procurado 🎉 Congratulations].freeze

  describe ".verification_received" do
    subject(:mail) { described_class.verification_received(account, verification).deliver_now }

    it "goes to the account's notification_email" do
      expect(mail.to).to eq([account.notification_email])
    end

    it "uses the sober subject line" do
      expect(mail.subject).to eq("Seu perfil foi verificado")
    end

    it "includes company name, job_title · area, and timestamp in the text body" do
      text = mail.text_part.body.to_s
      expect(text).to include("Acme Corp")
      expect(text).to include("Senior · Backend")
      expect(text).to include("26/05/2026 às 12:30")
    end

    it "mirrors the data in the HTML body" do
      html = mail.html_part.body.to_s
      expect(html).to include("Acme Corp")
      expect(html).to include("Senior · Backend")
      expect(html).to include("26/05/2026 às 12:30")
    end

    it "contains no celebratory copy (witness, not cheerleader)" do
      text = mail.text_part.body.to_s
      html = mail.html_part.body.to_s
      CELEBRATORY.each do |word|
        expect(text).not_to include(word), "text body should not contain #{word.inspect}"
        expect(html).not_to include(word), "html body should not contain #{word.inspect}"
      end
      # Exclamation marks are the canonical hype signal — ban them.
      expect(text).not_to include("!")
      expect(html.gsub(/<[^>]+>/, " ")).not_to include("!")
    end

    it "deposits one message in the delivery queue" do
      expect { mail }.to change(ActionMailer::Base.deliveries, :count).by(1)
    end
  end
end
