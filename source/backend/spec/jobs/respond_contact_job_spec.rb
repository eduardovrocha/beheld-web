require "rails_helper"

RSpec.describe RespondContactJob, type: :job do
  let(:account) { create(:account, :with_contact, email_recovery: "recovery@example.com") }
  let(:company) { create(:company, email: "hr@acme.example") }
  let(:bundle)  { create(:bundle, account: account) }
  let(:message) do
    Message.create!(
      bundle_id_unused: nil,
      account:          account,
      company:          company,
      body:             "Olá",
      sent_at:          Time.current,
    ).then do |m|
      # message factory ignores bundle reference — we just need a row that
      # links the account + company that the dev wants to share contact with.
      m
    end
  rescue ActiveRecord::UnknownAttributeError
    Message.create!(account: account, company: company, body: "Olá", sent_at: Time.current)
  end

  before { ActionMailer::Base.deliveries.clear }

  it "delivers the ContactMailer.respond email when contact is configured" do
    expect {
      described_class.perform_now(message.id)
    }.to change(ActionMailer::Base.deliveries, :count).by(1)

    mail = ActionMailer::Base.deliveries.last
    expect(mail.to).to eq([company.email])
    expect(mail.subject).to include(account.display_handle)
  end

  it "is a no-op when the Message doesn't exist" do
    expect {
      described_class.perform_now(123_456)
    }.not_to change(ActionMailer::Base.deliveries, :count)
  end

  it "is a no-op when the dev hasn't configured contact details" do
    account.update!(email_contact: nil, phone_contact: nil)

    expect {
      described_class.perform_now(message.id)
    }.not_to change(ActionMailer::Base.deliveries, :count)
  end
end
