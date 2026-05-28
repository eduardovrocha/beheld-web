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

  # Aliases adicionados em PP-VAL para casar com a nomenclatura da spec.
  describe "#expire! (alias forçado)" do
    it "muda status para expired sem checar expires_at" do
      position.update!(status: "active", activated_at: 1.day.ago, expires_at: 29.days.from_now)
      position.expire!
      expect(position.reload.status).to eq("expired")
    end
  end

  describe "#reactivate! (alias de activate!)" do
    it "reinicia o clock de 30 dias após uma expiração" do
      position.update!(status: "expired", expires_at: 1.day.ago)
      position.reactivate!
      expect(position.reload.status).to       eq("active")
      expect(position.reload.expires_at).to   be_within(2).of(Time.current + Position::ACTIVATION_WINDOW)
    end
  end

  # PF.1 — location migrou de string para jsonb (region/country/state/city)
  # com fallback { raw } pras rows antigas.
  describe "location jsonb" do
    it "aceita a hierarquia estruturada do picker" do
      loc = { "region" => "south_america", "country" => "BR", "state" => "MG", "city" => "Uberlândia" }
      position.update!(location: loc)
      expect(position.reload.location).to eq(loc)
      expect(position.location).to be_a(Hash)
    end

    it "aceita { region: 'remote' } sem os demais níveis" do
      position.update!(location: { "region" => "remote" })
      expect(position.reload.location).to eq({ "region" => "remote" })
    end

    it "default de uma nova row persistida é {}" do
      fresh = company.positions.create!(title: "Nova", status: "active")
      expect(fresh.reload.location).to eq({})
    end

    it "preserva location.raw de rows migradas (fallback de display)" do
      position.update!(location: { "raw" => "São Paulo · híbrido" })
      expect(position.reload.location).to eq({ "raw" => "São Paulo · híbrido" })
    end

    it "coage string legada (seeds/console) para { raw }" do
      position.update!(location: "Remoto")
      expect(position.reload.location).to eq({ "raw" => "Remoto" })
    end

    it "coage string vazia para {}" do
      position.update!(location: "")
      expect(position.reload.location).to eq({})
    end

    it "rejeita chaves fora do conjunto canônico" do
      position.location = { "evil" => "x" }
      expect(position).not_to be_valid
      expect(position.errors[:location]).to be_present
    end

    it "rejeita valores não-string longos demais" do
      position.location = { "city" => "a" * 121 }
      expect(position).not_to be_valid
      expect(position.errors[:location]).to be_present
    end
  end
end
