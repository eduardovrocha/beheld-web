require "rails_helper"

RSpec.describe ExpiredPositionNotificationJob, type: :job do
  let(:company)  { Company.create!(name: "Acme", email: "ops@acme.test") }
  let(:position) { company.positions.create!(title: "Backend", status: "expired") }

  it "enfileira o PositionMailer.expired quando a position está expirada" do
    expect {
      described_class.perform_now(position.id)
    }.to have_enqueued_mail(PositionMailer, :expired).with(position)
  end

  it "no-op quando a position foi reactivated antes do job rodar" do
    position.update_column(:status, "active")
    expect {
      described_class.perform_now(position.id)
    }.not_to have_enqueued_mail(PositionMailer, :expired)
  end

  it "no-op quando a empresa não tem email cadastrado" do
    company.update_column(:email, "")
    expect {
      described_class.perform_now(position.id)
    }.not_to have_enqueued_mail(PositionMailer, :expired)
  end

  it "no-op quando a position foi deletada antes do job rodar" do
    expect {
      described_class.perform_now(-1)
    }.not_to raise_error
  end

  describe "callback wiring" do
    it "Position#expire! enfileira o job exatamente uma vez" do
      pos = company.positions.create!(title: "Tmp", status: "active",
                                       activated_at: 1.day.ago, expires_at: 29.days.from_now)
      expect {
        pos.expire!
      }.to have_enqueued_job(ExpiredPositionNotificationJob).with(pos.id).once
    end

    it "Position#expire_if_due! enfileira ao cruzar o threshold" do
      pos = company.positions.create!(title: "Tmp", status: "active",
                                       activated_at: 31.days.ago, expires_at: 1.day.ago)
      expect {
        pos.expire_if_due!
      }.to have_enqueued_job(ExpiredPositionNotificationJob).once
    end

    it "Position#expire_if_due! NÃO enfileira quando ainda está dentro da janela" do
      pos = company.positions.create!(title: "Tmp", status: "active",
                                       activated_at: 1.day.ago, expires_at: 29.days.from_now)
      expect {
        pos.expire_if_due!
      }.not_to have_enqueued_job(ExpiredPositionNotificationJob)
    end
  end
end
