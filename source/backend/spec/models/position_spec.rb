require "rails_helper"

RSpec.describe Position do
  let(:company) { Company.create!(name: "Acme", email: "ops@acme.test") }
  subject(:position) { company.positions.create!(title: "Senior Backend", status: "active") }

  describe "#activate!" do
    it "abre a janela de 30 dias e zera archived_at" do
      position.update!(archived_at: 1.day.ago)
      position.activate!
      expect(position.status).to       eq("active")
      expect(position.activated_at).to be_within(2).of(Time.current)
      expect(position.expires_at).to   be_within(2).of(Time.current + Position::ACTIVATION_WINDOW)
      expect(position.archived_at).to  be_nil
    end

    it "é idempotente quando a position já está ativa com expires_at futuro" do
      future = 10.days.from_now
      position.update!(status: "active", activated_at: 1.day.ago, expires_at: future)
      expect { position.activate! }.not_to change { position.reload.expires_at.to_i }
    end
  end

  describe "#expire_if_due!" do
    it "marca como expired quando a janela passou" do
      position.update!(status: "active", activated_at: 31.days.ago, expires_at: 1.day.ago)
      position.expire_if_due!
      expect(position.reload.status).to eq("expired")
    end

    it "não toca em positions ainda dentro da janela" do
      position.update!(status: "active", activated_at: 1.day.ago, expires_at: 29.days.from_now)
      expect { position.expire_if_due! }.not_to change { position.reload.status }
    end

    it "não promove positions encerradas a expiradas" do
      position.update!(status: "closed", archived_at: 1.day.ago, expires_at: 30.days.ago)
      expect { position.expire_if_due! }.not_to change { position.reload.status }
    end
  end

  describe "#close!" do
    it "preserva archived_at quando já estava presente" do
      ts = 5.days.ago
      position.update!(archived_at: ts)
      position.close!
      expect(position.reload.status).to       eq("closed")
      expect(position.reload.archived_at).to  be_within(1.second).of(ts)
    end
  end
end
