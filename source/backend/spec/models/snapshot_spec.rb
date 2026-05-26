require "rails_helper"

RSpec.describe Snapshot, type: :model do
  # ── fixtures ───────────────────────────────────────────────────────────────

  let(:base_scores) do
    {
      "overall" => 78,
      "prompt_quality" => 84,
      "test_maturity" => 62,
      "tech_breadth" => 91,
      "growth_rate" => 75,
      "date" => "2026-05-14",
      "sessions_analyzed" => 30,
    }
  end

  let(:v1_inner_payload) do
    {
      "created_at" => "2026-05-14T00:00:00+00:00",
      "beheld_version" => "0.1.0",
      "previous_hash" => nil,
      "scores" => base_scores,
      "signals" => {
        "platforms" => { "docker" => 10 },
        "ecosystems" => { "rails" => 8 },
        "workflow_distribution" => { "tdd" => 0.2 },
        "project_categories" => { "saas_b2b" => 1.0 },
        "workflow_metrics" => {},
        "sessions_analyzed" => 30,
        "period_days" => 30,
      },
    }
  end

  let(:v2_inner_payload) do
    {
      "created_at" => "2026-05-14T00:00:00+00:00",
      "beheld_version" => "0.3.0",
      "previous_hash" => nil,
      "scores" => base_scores,
      "l1" => {
        "total_repos" => 12,
        "total_commits" => 4832,
        "earliest_commit" => "2019-03-10T09:00:00+00:00",
        "latest_commit" => "2025-11-20T18:00:00+00:00",
        "ecosystems" => { "rails" => true, "python" => true },
        "platforms" => { "docker" => true },
        "avg_test_ratio" => 0.42,
        "root_commit_hashes" => ["a" * 40, "b" * 40],
      },
      "l2" => {
        "platforms" => { "docker" => 10 },
        "ecosystems" => { "node" => 5 },
        "workflow_distribution" => { "tdd" => 0.2 },
        "project_categories" => {},
        "workflow_metrics" => {},
        "sessions_analyzed" => 847,
        "period_days" => 90,
      },
    }
  end

  def wrap(inner)
    {
      "version" => inner.key?("l1") ? "2" : "1",
      "payload" => inner,
      "hash" => "sha256:" + ("a" * 64),
      "signature" => "ed25519:" + ("b" * 128),
      "public_key" => "ed25519:" + "x" * 43,
    }
  end

  # ── schema_version ─────────────────────────────────────────────────────────

  describe ".schema_version" do
    it "retorna :v2 quando l1 e l2 presentes" do
      expect(Snapshot.schema_version(v2_inner_payload)).to eq(:v2)
    end

    it "retorna :v1 quando signals presente" do
      expect(Snapshot.schema_version(v1_inner_payload)).to eq(:v1)
    end

    it "retorna :unknown quando nenhum dos dois" do
      expect(Snapshot.schema_version({ "scores" => base_scores })).to eq(:unknown)
    end

    it "retorna :unknown para entrada não-hash" do
      expect(Snapshot.schema_version(nil)).to eq(:unknown)
      expect(Snapshot.schema_version("not a hash")).to eq(:unknown)
      expect(Snapshot.schema_version([])).to eq(:unknown)
    end

    it "prefere :v2 quando ambos l1+l2 e signals estão presentes (futuro misto)" do
      mixed = v2_inner_payload.merge("signals" => {})
      expect(Snapshot.schema_version(mixed)).to eq(:v2)
    end
  end

  # ── valid_payload? ─────────────────────────────────────────────────────────

  describe ".valid_payload?" do
    it "aceita payload v1 com signals" do
      expect(Snapshot.valid_payload?(v1_inner_payload)).to be(true)
    end

    it "aceita payload v2 com l1 e l2" do
      expect(Snapshot.valid_payload?(v2_inner_payload)).to be(true)
    end

    it "rejeita payload sem scores" do
      bad = v2_inner_payload.dup.tap { |h| h.delete("scores") }
      expect(Snapshot.valid_payload?(bad)).to be(false)
    end

    it "rejeita payload sem created_at" do
      bad = v2_inner_payload.dup.tap { |h| h.delete("created_at") }
      expect(Snapshot.valid_payload?(bad)).to be(false)
    end

    it "rejeita payload sem beheld_version" do
      bad = v2_inner_payload.dup.tap { |h| h.delete("beheld_version") }
      expect(Snapshot.valid_payload?(bad)).to be(false)
    end

    it "rejeita payload com schema :unknown (sem signals nem l1+l2)" do
      bad = { "created_at" => "x", "beheld_version" => "y", "scores" => base_scores }
      expect(Snapshot.valid_payload?(bad)).to be(false)
    end

    it "rejeita scores incompletos" do
      bad = v2_inner_payload.merge("scores" => { "overall" => 50 })
      expect(Snapshot.valid_payload?(bad)).to be(false)
    end

    it "rejeita scores não-hash" do
      bad = v2_inner_payload.merge("scores" => 50)
      expect(Snapshot.valid_payload?(bad)).to be(false)
    end
  end

  # ── persistence: schema_version auto-assignment ────────────────────────────

  describe "schema_version persistence" do
    it "grava schema_version='v1' ao salvar bundle com signals" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("a" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v1_inner_payload),
      )
      expect(b.schema_version).to eq("v1")
    end

    it "grava schema_version='v2' ao salvar bundle com l1+l2" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("c" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v2_inner_payload),
      )
      expect(b.schema_version).to eq("v2")
    end

    it "rejeita save quando schema é :unknown" do
      bad_inner = { "created_at" => "x", "beheld_version" => "y", "scores" => base_scores }
      b = Snapshot.new(
        bundle_hash: "sha256:" + ("d" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(bad_inner).tap { |w| w["payload"] = bad_inner },
      )
      expect(b.save).to be(false)
      expect(b.errors[:schema_version]).to be_present
    end
  end

  # ── public_view ────────────────────────────────────────────────────────────

  describe "#public_view" do
    it "inclui l1 e l2 para bundle v2" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("e" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v2_inner_payload),
      )
      view = b.public_view
      expect(view[:schema_version]).to eq("v2")
      expect(view[:l1]).to be_a(Hash)
      expect(view[:l2]).to be_a(Hash)
      expect(view).not_to have_key(:signals)
    end

    it "inclui signals para bundle v1 (sem l1/l2)" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("f" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v1_inner_payload),
      )
      view = b.public_view
      expect(view[:schema_version]).to eq("v1")
      expect(view[:signals]).to be_a(Hash)
      expect(view).not_to have_key(:l1)
      expect(view).not_to have_key(:l2)
    end
  end
end
