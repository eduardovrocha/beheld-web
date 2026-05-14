require "rails_helper"

# Dedicated badge tests (Phase 6 / Obj 2). Color buckets, SVG validity, and
# the `?style=` / `?label=` parameters are exercised here so failures point
# at the badge contract directly rather than getting buried in a larger spec.
RSpec.describe "GET /v/:id/badge.svg", type: :request do
  def make_bundle(overall:, hash_seed:)
    inner = {
      "created_at" => "2026-05-14T00:00:00+00:00",
      "devprofile_version" => "0.3.0",
      "previous_hash" => nil,
      "scores" => {
        "overall" => overall,
        "prompt_quality" => overall,
        "test_maturity" => overall,
        "tech_breadth" => overall,
        "growth_rate" => overall,
        "date" => "2026-05-14",
        "sessions_analyzed" => 1,
      },
      "l1" => {
        "total_repos" => 0, "total_commits" => 0,
        "earliest_commit" => nil, "latest_commit" => nil,
        "ecosystems" => {}, "platforms" => {},
        "avg_test_ratio" => 0.0, "root_commit_hashes" => [],
      },
      "l2" => {
        "platforms" => {}, "ecosystems" => {}, "workflow_distribution" => {},
        "project_categories" => {}, "workflow_metrics" => {},
        "sessions_analyzed" => 1, "period_days" => 30,
      },
    }
    Bundle.create!(
      bundle_hash: "sha256:" + (hash_seed * 64)[0, 64],
      public_key: "ed25519:" + ("k" * 43),
      payload: {
        "version" => "2",
        "payload" => inner,
        "hash" => "sha256:" + (hash_seed * 64)[0, 64],
        "signature" => "ed25519:" + ("b" * 128),
        "public_key" => "ed25519:" + ("k" * 43),
      },
    )
  end

  it "retorna SVG válido para GET /v/:id/badge.svg" do
    b = make_bundle(overall: 78, hash_seed: "1")
    get "/v/#{b.short_id}/badge.svg"
    expect(response).to have_http_status(:ok)
    expect(response.content_type).to start_with("image/svg+xml")
    expect(response.body).to start_with("<svg")
    expect(response.body).to include("</svg>")
  end

  it "badge é verde para score >= 75" do
    b = make_bundle(overall: 85, hash_seed: "2")
    get "/v/#{b.short_id}/badge.svg"
    expect(response.body).to include("22c55e")
  end

  it "badge é amarelo para score 50-74" do
    b = make_bundle(overall: 60, hash_seed: "3")
    get "/v/#{b.short_id}/badge.svg"
    expect(response.body).to include("eab308")
  end

  it "badge é vermelho para score < 50" do
    b = make_bundle(overall: 20, hash_seed: "4")
    get "/v/#{b.short_id}/badge.svg"
    expect(response.body).to include("ef4444")
  end

  it "badge aceita parâmetro style=for-the-badge" do
    b = make_bundle(overall: 78, hash_seed: "5")
    get "/v/#{b.short_id}/badge.svg?style=for-the-badge"
    expect(response).to have_http_status(:ok)
    # for-the-badge uses uppercased label and bold weight.
    expect(response.body).to include("DEVPROFILE")
    expect(response.body).to include('font-weight="bold"')
  end

  it "badge aceita parâmetro label customizado" do
    b = make_bundle(overall: 78, hash_seed: "6")
    get "/v/#{b.short_id}/badge.svg?label=verified-dev"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("verified-dev")
  end

  it "rejeita silenciosamente style desconhecido (cai em flat)" do
    b = make_bundle(overall: 78, hash_seed: "7")
    get "/v/#{b.short_id}/badge.svg?style=invalid"
    expect(response).to have_http_status(:ok)
    # Flat style uses lowercased label.
    expect(response.body).to include("devprofile")
    expect(response.body).not_to include('font-weight="bold"')
  end

  it "limites de cor — score=75 é verde, score=50 é amarelo, score=49 é vermelho" do
    bg = make_bundle(overall: 75, hash_seed: "8")
    by = make_bundle(overall: 50, hash_seed: "9")
    br = make_bundle(overall: 49, hash_seed: "a")
    get "/v/#{bg.short_id}/badge.svg"
    expect(response.body).to include("22c55e")
    get "/v/#{by.short_id}/badge.svg"
    expect(response.body).to include("eab308")
    get "/v/#{br.short_id}/badge.svg"
    expect(response.body).to include("ef4444")
  end
end
