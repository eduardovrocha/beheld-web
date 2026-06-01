require "rails_helper"

RSpec.describe Positions::EvolutionCurve do
  let(:account) { Account.create!(fingerprint: "fp_#{SecureRandom.hex(4)}", directory: true) }

  def add_bundle(test_ratio:, days_ago:)
    Bundle.create!(
      account:        account,
      url_slug:       "s_#{SecureRandom.hex(3)}",
      bundle_data:    { "payload" => { "l1" => { "avg_test_ratio" => test_ratio } } },
      visible:        true,
      last_bundle_at: days_ago.days.ago,
      published_at:   days_ago.days.ago,
    )
  end

  describe "test_ratio (single supported signal)" do
    it "retorna `none` quando o dev não tem bundles ativos" do
      expect(described_class.for(account, "test_ratio")["status"]).to eq("none")
    end

    it "retorna `building` quando o dev tem exatamente 1 bundle" do
      add_bundle(test_ratio: 0.20, days_ago: 1)
      r = described_class.for(account, "test_ratio")
      expect(r["status"]).to  eq("building")
      expect(r["current"]).to eq(20.0)
      expect(r["points"]).to  eq(1)
    end

    it "calcula delta + trend ↑ quando o dev evoluiu" do
      add_bundle(test_ratio: 0.22, days_ago: 60)
      add_bundle(test_ratio: 0.27, days_ago: 30)
      add_bundle(test_ratio: 0.25, days_ago: 1)
      r = described_class.for(account, "test_ratio")
      expect(r["status"]).to      eq("available")
      expect(r["current"]).to     eq(25.0)
      expect(r["delta"]).to       eq(3.0)
      expect(r["trend"]).to       eq("up")
      expect(r["points"]).to      eq(3)
      expect(r["period_days"]).to be_within(2).of(59)
    end

    it "trend ↓ quando o sinal caiu" do
      add_bundle(test_ratio: 0.40, days_ago: 60)
      add_bundle(test_ratio: 0.20, days_ago: 1)
      expect(described_class.for(account, "test_ratio")["trend"]).to eq("down")
    end

    it "trend estável quando delta = 0" do
      add_bundle(test_ratio: 0.30, days_ago: 60)
      add_bundle(test_ratio: 0.30, days_ago: 1)
      expect(described_class.for(account, "test_ratio")["trend"]).to eq("stable")
    end

    it "ignora bundles revogados" do
      bundle = add_bundle(test_ratio: 0.99, days_ago: 60)
      bundle.update!(revoked_at: Time.current)
      add_bundle(test_ratio: 0.40, days_ago: 1)
      r = described_class.for(account, "test_ratio")
      expect(r["status"]).to  eq("building")
      expect(r["current"]).to eq(40.0)
    end
  end

  describe "sinais não suportados" do
    it "retorna not_applicable para ecosystems" do
      add_bundle(test_ratio: 0.5, days_ago: 1)
      expect(described_class.for(account, "ecosystems")["status"]).to eq("not_applicable")
    end

    it "retorna not_applicable para recency" do
      add_bundle(test_ratio: 0.5, days_ago: 1)
      expect(described_class.for(account, "recency")["status"]).to eq("not_applicable")
    end
  end

  # ── R1.3 — same fallback chain as BundleSignals (core → l1) ───────────────
  describe "R1.3 core/l1 fallback chain on extract()" do
    def add_core_bundle(test_ratio:, days_ago:)
      Bundle.create!(
        account:        account,
        url_slug:       "s_#{SecureRandom.hex(3)}",
        bundle_data:    { "payload" => { "core" => { "avg_test_ratio" => test_ratio } } },
        visible:        true,
        last_bundle_at: days_ago.days.ago,
        published_at:   days_ago.days.ago,
      )
    end

    it "lê test_ratio de bundles v3 (payload.core)" do
      add_core_bundle(test_ratio: 0.33, days_ago: 1)
      r = described_class.for(account, "test_ratio")
      expect(r["status"]).to  eq("building")
      expect(r["current"]).to eq(33.0)
    end

    it "mistura bundles v3 e legacy v2 na mesma curva" do
      # Mais antigo é legacy v2; mais recente é v3.
      add_bundle(test_ratio: 0.20, days_ago: 60)
      add_core_bundle(test_ratio: 0.35, days_ago: 1)
      r = described_class.for(account, "test_ratio")
      expect(r["status"]).to  eq("available")
      expect(r["current"]).to eq(35.0)
      expect(r["delta"]).to   eq(15.0)
      expect(r["trend"]).to   eq("up")
    end
  end
end
