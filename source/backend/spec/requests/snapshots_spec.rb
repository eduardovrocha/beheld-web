require "rails_helper"

RSpec.describe "Bundles + V endpoints (Phase 6 retrocompat)", type: :request do
  # ── shared fixtures ────────────────────────────────────────────────────────

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

  let(:v1_inner) do
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

  let(:v2_inner) do
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
        "ecosystems" => { "rails" => true },
        "platforms" => { "docker" => true },
        "avg_test_ratio" => 0.42,
        "root_commit_hashes" => ["a" * 40],
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

  # R1.3 — v3 (core/enrichment) inner payload.
  let(:v3_inner) do
    {
      "created_at" => "2026-05-14T00:00:00+00:00",
      "beheld_version" => "0.4.0",
      "previous_hash" => nil,
      "scores" => base_scores,
      "core" => {
        "total_repos" => 12,
        "total_commits" => 4832,
        "ecosystems" => { "rails" => true, "python" => true },
        "platforms" => { "docker" => true },
        "avg_test_ratio" => 0.42,
      },
      "enrichment" => {
        "platforms" => { "docker" => 10 },
        "ecosystems" => { "node" => 5 },
        "workflow_distribution" => { "tdd" => 0.2 },
        "harness_sources" => [
          { "harness" => "claude_code", "capture_fidelity" => "native_hook", "sessions" => 100 },
        ],
        "sessions_analyzed" => 100,
      },
    }
  end

  let(:l1_empty_inner) do
    v2_inner.merge(
      "l1" => v2_inner["l1"].merge(
        "total_repos" => 0,
        "total_commits" => 0,
        "earliest_commit" => nil,
        "latest_commit" => nil,
        "ecosystems" => {},
        "platforms" => {},
        "avg_test_ratio" => 0.0,
        "root_commit_hashes" => [],
      ),
    )
  end

  def wrap(inner, hash_seed: "a")
    version =
      if    inner.key?("core") then "7"
      elsif inner.key?("l1")   then "5"
      else                          "1"
      end
    {
      "version" => version,
      "payload" => inner,
      "hash" => "sha256:" + (hash_seed * 64)[0, 64],
      "signature" => "ed25519:" + ("b" * 128),
      "public_key" => "ed25519:" + "x" * 43,
    }
  end

  # ── POST /bundles ──────────────────────────────────────────────────────────

  describe "POST /bundles" do
    it "aceita bundle v1 válido e grava schema_version='v1'" do
      post "/bundles",
           params: wrap(v1_inner, hash_seed: "1").to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["schema_version"]).to eq("v1")
      expect(Snapshot.find_by(short_id: body["id"]).schema_version).to eq("v1")
    end

    it "aceita bundle v2 válido e grava schema_version='v2'" do
      post "/bundles",
           params: wrap(v2_inner, hash_seed: "2").to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["schema_version"]).to eq("v2")
      expect(Snapshot.find_by(short_id: body["id"]).schema_version).to eq("v2")
    end

    # R1.3 — v3 (core/enrichment, BUNDLE_VERSION 6+7) acceptance.
    # NOTE: hash_seed must stay in [0-9a-f] — bundle_hash format gate.
    it "aceita bundle v3 com core+enrichment e grava schema_version='v3'" do
      post "/bundles",
           params: wrap(v3_inner, hash_seed: "1a").to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["schema_version"]).to eq("v3")
      expect(Snapshot.find_by(short_id: body["id"]).schema_version).to eq("v3")
    end

    it "aceita bundle v3 só com core (enrichment opcional)" do
      core_only = {
        "created_at" => "2026-05-14T00:00:00+00:00",
        "beheld_version" => "0.4.0",
        "previous_hash" => nil,
        "scores" => base_scores,
        "core" => { "ecosystems" => { "go" => true }, "avg_test_ratio" => 0.18 },
      }
      post "/bundles",
           params: wrap(core_only, hash_seed: "2b").to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)["schema_version"]).to eq("v3")
    end

    it "rejeita bundle com payload sem signals nem l1+l2" do
      bad_inner = {
        "created_at" => "x",
        "beheld_version" => "y",
        "scores" => base_scores,
      }
      post "/bundles",
           params: wrap(bad_inner, hash_seed: "3").to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)
      expect(body["error"]).to eq("invalid payload")
    end

    it "rejeita bundle com payload sem scores" do
      bad_inner = v2_inner.dup.tap { |h| h.delete("scores") }
      post "/bundles",
           params: wrap(bad_inner, hash_seed: "4").to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "deduplica por bundle_hash em uploads repetidos" do
      payload = wrap(v2_inner, hash_seed: "5")
      post "/bundles", params: payload.to_json,
                       headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:created)

      post "/bundles", params: payload.to_json,
                       headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["deduplicated"]).to be(true)
    end

    it "rejeita JSON malformado com 400" do
      post "/bundles", params: "not json {{", headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:bad_request)
    end
  end

  # ── GET /v/:id ─────────────────────────────────────────────────────────────

  describe "GET /v/:id" do
    it "devolve payload v1 contendo signals (JSON via Accept header)" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("6" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v1_inner, hash_seed: "6"),
      )
      get "/v/#{b.short_id}", headers: { "Accept" => "application/json" }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("payload", "signals")).to be_a(Hash)
      expect(body.dig("payload", "l1")).to be_nil
    end

    it "devolve payload v2 contendo l1 e l2 separados (JSON via Accept header)" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("7" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v2_inner, hash_seed: "7"),
      )
      get "/v/#{b.short_id}", headers: { "Accept" => "application/json" }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("payload", "l1")).to be_a(Hash)
      expect(body.dig("payload", "l2")).to be_a(Hash)
      expect(body.dig("payload", "signals")).to be_nil
    end

    it "renderiza HTML por padrão (Phase 6 / Obj 2 — SSR sem JS obrigatório)" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("0123456789abcdef" * 4),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v2_inner, hash_seed: "f"),
      )
      get "/v/#{b.short_id}"
      expect(response).to have_http_status(:ok)
      expect(response.content_type).to start_with("text/html")
      expect(response.body).to include("Git History Analysis")
    end

    it "rotula schema_version no /v/:id/summary para v1" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("8" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v1_inner, hash_seed: "8"),
      )
      get "/v/#{b.short_id}/summary"
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["schema_version"]).to eq("v1")
    end

    it "devolve payload v3 contendo core e enrichment (JSON via Accept header)" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("c" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v3_inner, hash_seed: "c"),
      )
      get "/v/#{b.short_id}", headers: { "Accept" => "application/json" }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("payload", "core")).to be_a(Hash)
      expect(body.dig("payload", "enrichment")).to be_a(Hash)
      expect(body.dig("payload", "l1")).to be_nil
      expect(body.dig("payload", "l2")).to be_nil
      expect(body.dig("payload", "signals")).to be_nil
    end

    it "rotula schema_version no /v/:id/summary para v3" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("3" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v3_inner, hash_seed: "3"),
      )
      get "/v/#{b.short_id}/summary"
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)
      expect(data["schema_version"]).to eq("v3")
      expect(data["core"]).to be_a(Hash)
      expect(data["enrichment"]).to be_a(Hash)
    end

    it "rotula schema_version no /v/:id/summary para v2" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("9" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v2_inner, hash_seed: "9"),
      )
      get "/v/#{b.short_id}/summary"
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)
      expect(data["schema_version"]).to eq("v2")
      expect(data["l1"]).to be_a(Hash)
      expect(data["l2"]).to be_a(Hash)
    end

    it "preserva total_repos=0 para bootstrap não realizado (l1 vazio)" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("a" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(l1_empty_inner, hash_seed: "a"),
      )
      get "/v/#{b.short_id}/summary"
      data = JSON.parse(response.body)
      expect(data.dig("l1", "total_repos")).to eq(0)
      expect(data.dig("l1", "root_commit_hashes")).to eq([])
    end
  end

  # ── GET /v/:id/badge.svg ───────────────────────────────────────────────────

  describe "GET /v/:id/badge.svg" do
    def bundle_with_score(overall, hash_seed)
      inner = v2_inner.deep_dup
      inner["scores"]["overall"] = overall
      Snapshot.create!(
        bundle_hash: "sha256:" + (hash_seed * 64)[0, 64],
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(inner, hash_seed: hash_seed),
      )
    end

    it "renderiza verde para score >= 75" do
      b = bundle_with_score(85, "b")
      get "/v/#{b.short_id}/badge.svg"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("22c55e")
    end

    it "renderiza amarelo para score 50-74" do
      b = bundle_with_score(60, "c")
      get "/v/#{b.short_id}/badge.svg"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("eab308")
    end

    it "renderiza vermelho para score < 50" do
      b = bundle_with_score(20, "d")
      get "/v/#{b.short_id}/badge.svg"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("ef4444")
    end

    it "renderiza amarelo no limite inferior 50" do
      b = bundle_with_score(50, "e")
      get "/v/#{b.short_id}/badge.svg"
      expect(response.body).to include("eab308")
    end

    it "renderiza verde no limite inferior 75" do
      b = bundle_with_score(75, "f")
      get "/v/#{b.short_id}/badge.svg"
      expect(response.body).to include("22c55e")
    end

    it "funciona com bundle v1 (retrocompat — overall vive em scores nos dois schemas)" do
      b = Snapshot.create!(
        bundle_hash: "sha256:" + ("1" * 64),
        public_key: "ed25519:" + "k" * 43,
        payload: wrap(v1_inner, hash_seed: "1"),
      )
      get "/v/#{b.short_id}/badge.svg"
      expect(response).to have_http_status(:ok)
      # base_scores has overall=78 → green
      expect(response.body).to include("22c55e")
    end
  end
end
