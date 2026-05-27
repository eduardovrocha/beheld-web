# Unit tests for the matching engine — lock down the threshold filter,
# the near-miss margin, and the score formula. We use FactoryBot for
# Company / Account / Bundle and build the thresholds + priorities inline
# so each example reads as a self-contained scenario.

require "rails_helper"

RSpec.describe Positions::Matcher do
  let(:company)  { Company.create!(name: "Acme", email: "ops@acme.test") }
  let(:position) { company.positions.create!(title: "Senior Backend", status: "active") }

  def build_account(traits = {})
    fp = "fp_#{SecureRandom.hex(4)}"
    account = Account.create!(
      fingerprint: fp,
      directory:   traits.fetch(:directory, true),
    )
    bundle_data = {
      "payload" => {
        "l1" => {
          "ecosystems"     => traits.fetch(:ecosystems, {}),
          "avg_test_ratio" => traits.fetch(:test_ratio, 0.0),
        },
      },
    }
    days_ago = traits.fetch(:days_since_bundle, 1)
    Bundle.create!(
      account:        account,
      url_slug:       "slug-#{SecureRandom.hex(3)}",
      bundle_data:    bundle_data,
      visible:        true,
      revoked_at:     nil,
      last_bundle_at: days_ago.days.ago,
      published_at:   days_ago.days.ago,
    )
    account
  end

  def add_threshold(signal, value)
    payload =
      case signal
      when "ecosystems" then { "items" => Array(value).map(&:to_s) }
      else                   { "number" => value.to_f }
      end
    op = PositionThreshold::OPERATOR_FOR[signal]
    position.thresholds.create!(signal: signal, operator: op, value: payload)
  end

  def add_priority(signal, ranking)
    position.priorities.create!(signal: signal, ranking: ranking)
  end

  describe "phase 1 — threshold filter" do
    it "promove dev que passa em todos os thresholds para match" do
      add_threshold("ecosystems", %w[react])
      add_threshold("test_ratio", 30)
      add_threshold("recency",    30)
      add_priority("ecosystems", 1)
      add_priority("test_ratio", 2)
      add_priority("recency",    3)
      build_account(ecosystems: { "react" => true, "rails" => true },
                    test_ratio: 0.40,
                    days_since_bundle: 5)

      rows = described_class.calculate!(position)
      expect(rows.map(&:match_type)).to eq(["match"])
      # Spec formula: ecosystems (100×0.40=40) + test_ratio capped (1.0×0.30=30)
      # + recency ((1-5/30)×0.20 ≈ 16.67) = ~86.67.
      expect(rows.first.score.to_f).to be_within(0.5).of(86.67)
    end

    it "descarta dev que falha em 2 ou mais thresholds" do
      add_threshold("ecosystems", %w[react])
      add_threshold("test_ratio", 30)
      build_account(ecosystems: { "rails" => true }, test_ratio: 0.05)

      expect(described_class.calculate!(position)).to be_empty
    end

    it "ignora devs com directory: false" do
      add_threshold("test_ratio", 0)
      build_account(directory: false, test_ratio: 0.50)
      expect(described_class.calculate!(position)).to be_empty
    end
  end

  describe "phase 1 — near-miss" do
    it "1 falha numérica dentro de 20% → near_miss" do
      add_threshold("test_ratio", 30)
      add_priority("test_ratio", 1)
      build_account(test_ratio: 0.25)   # gap 16.7%

      rows = described_class.calculate!(position)
      expect(rows.size).to eq(1)
      expect(rows.first.match_type).to    eq("near_miss")
      expect(rows.first.failed_signal).to eq("test_ratio")
    end

    it "1 falha numérica acima da margem → descartado" do
      add_threshold("test_ratio", 30)
      build_account(test_ratio: 0.10)   # gap 66%

      expect(described_class.calculate!(position)).to be_empty
    end

    it "ecosystem ausente sem outras falhas → near_miss (sem margem)" do
      add_threshold("ecosystems", %w[react])
      add_threshold("test_ratio", 30)
      add_priority("test_ratio", 1)
      build_account(ecosystems: { "rails" => true }, test_ratio: 0.40)

      rows = described_class.calculate!(position)
      expect(rows.size).to eq(1)
      expect(rows.first.match_type).to    eq("near_miss")
      expect(rows.first.failed_signal).to eq("ecosystems")
    end
  end

  describe "phase 2 — score formula" do
    it "respeita o exemplo da spec (test_ratio capped + recency proporcional)" do
      add_threshold("ecosystems", %w[react])
      add_threshold("test_ratio", 30)
      add_threshold("recency",    30)
      add_priority("ecosystems", 1)   # 40%
      add_priority("test_ratio", 2)   # 30%
      add_priority("recency",    3)   # 20%

      build_account(ecosystems: { "react" => true },
                    test_ratio: 0.38,     # 38% → capped at 100% × 0.30 = 30
                    days_since_bundle: 8) # (1 - 8/30) × 100 × 0.20 = 14.67

      rows = described_class.calculate!(position)
      expect(rows.size).to eq(1)
      expect(rows.first.score.to_f).to be_within(0.5).of(84.7)
    end

    it "score do near_miss não inclui o sinal que falhou" do
      add_threshold("ecosystems", %w[react])
      add_threshold("test_ratio", 30)
      add_priority("ecosystems", 1)
      add_priority("test_ratio", 2)

      # Falhou ecosystems → 0 × 0.40; test_ratio 1.0 × 0.30 = 30
      build_account(ecosystems: { "rails" => true }, test_ratio: 0.40)
      rows = described_class.calculate!(position)
      expect(rows.first.match_type).to eq("near_miss")
      expect(rows.first.score.to_f).to be_within(0.5).of(30.0)
    end
  end

  describe "persistence" do
    it "trunca matches anteriores antes de re-inserir" do
      add_threshold("test_ratio", 30)
      add_priority("test_ratio", 1)
      acc = build_account(test_ratio: 0.50)
      described_class.calculate!(position)
      expect(position.matches.count).to eq(1)

      # Re-run com o mesmo dataset não deve duplicar.
      described_class.calculate!(position)
      expect(position.matches.count).to eq(1)
      expect(position.matches.pluck(:account_id)).to eq([acc.id])
    end
  end
end
