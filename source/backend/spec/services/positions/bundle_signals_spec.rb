require "rails_helper"

RSpec.describe Positions::BundleSignals do
  let(:account) { Account.create!(fingerprint: "fp_#{SecureRandom.hex(4)}", directory: true) }

  def build_bundle(payload:, days_ago: 3)
    Bundle.create!(
      account:        account,
      url_slug:       "s_#{SecureRandom.hex(3)}",
      bundle_data:    { "payload" => payload },
      visible:        true,
      last_bundle_at: days_ago.days.ago,
      published_at:   days_ago.days.ago,
    )
  end

  describe "ecosystems (camada estrutural l1, presença booleana)" do
    it "converte { nome => true } em lista de strings minúsculas" do
      b = build_bundle(payload: { "l1" => { "ecosystems" => { "Rails" => true, "React" => true } } })
      expect(described_class.from(b).ecosystems).to match_array(%w[rails react])
    end

    it "exclui ecosystems com valor false" do
      b = build_bundle(payload: { "l1" => { "ecosystems" => { "rails" => true, "python" => false } } })
      expect(described_class.from(b).ecosystems).to eq(%w[rails])
    end

    it "retorna [] quando l1.ecosystems está ausente" do
      b = build_bundle(payload: { "scores" => { "test_maturity" => 50 } })
      expect(described_class.from(b).ecosystems).to eq([])
    end

    it "IGNORA o bloco de apresentação signals.ecosystems (arrays categorizados)" do
      b = build_bundle(payload: {
        "l1"      => { "ecosystems" => { "rails" => true } },
        "signals" => { "ecosystems" => { "dominant" => %w[react node], "secondary" => [] } },
      })
      # Só o l1 conta — não vaza "react"/"node" do bloco de apresentação.
      expect(described_class.from(b).ecosystems).to eq(%w[rails])
    end
  end

  describe "test_ratio (avg_test_ratio 0–1 → percentual 0–100)" do
    it "multiplica a proporção por 100" do
      b = build_bundle(payload: { "l1" => { "avg_test_ratio" => 0.42 } })
      expect(described_class.from(b).test_ratio).to eq(42.0)
    end

    it "retorna 0.0 quando ausente (nunca quebra o cálculo)" do
      b = build_bundle(payload: { "l1" => {} })
      expect(described_class.from(b).test_ratio).to eq(0.0)
    end

    it "NÃO usa scores.test_maturity (índice derivado de apresentação)" do
      b = build_bundle(payload: {
        "l1"     => { "avg_test_ratio" => 0.10 },
        "scores" => { "test_maturity" => 65 },
      })
      # 0.10 → 10.0, não 65.
      expect(described_class.from(b).test_ratio).to eq(10.0)
    end
  end

  describe "recency_days (do campo de banco last_bundle_at)" do
    it "calcula dias inteiros desde a última publicação" do
      b = build_bundle(payload: { "l1" => {} }, days_ago: 8)
      expect(described_class.from(b).recency_days).to eq(8)
    end

    it "é nil quando não há bundle" do
      expect(described_class.from(nil).recency_days).to be_nil
    end
  end

  describe "#value_for" do
    it "expõe os três sinais pela chave canônica" do
      b = build_bundle(payload: { "l1" => { "ecosystems" => { "go" => true }, "avg_test_ratio" => 0.3 } }, days_ago: 2)
      s = described_class.from(b)
      expect(s.value_for("ecosystems")).to eq(%w[go])
      expect(s.value_for("test_ratio")).to eq(30.0)
      expect(s.value_for("recency")).to    eq(2)
      expect(s.value_for("languages")).to  be_nil   # não existe
    end
  end

  it "produz um objeto congelado (imutável)" do
    b = build_bundle(payload: { "l1" => {} })
    expect(described_class.from(b)).to be_frozen
  end
end
