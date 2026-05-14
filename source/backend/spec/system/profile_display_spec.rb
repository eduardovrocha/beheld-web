require "rails_helper"
require "capybara/rspec"

# Driver intencional: rack_test renders HTML without JavaScript.  Validates
# the "scores e sinais devem ser visíveis mesmo sem JS" requirement.  A
# separate scenario asserts that the inline JS for the Ed25519 verification
# is wired up so a browser would execute it.
RSpec.describe "Public profile page (/v/:id)", type: :system do
  before { driven_by(:rack_test) }

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

  let(:v1_inner) do
    {
      "created_at" => "2026-05-14T10:32:00+00:00",
      "devprofile_version" => "0.1.0",
      "previous_hash" => nil,
      "scores" => base_scores,
      "signals" => {
        "platforms" => { "docker" => 10, "github" => 5 },
        "ecosystems" => { "rails" => 8, "react" => 4 },
        "workflow_distribution" => { "tdd" => 0.23, "test-after" => 0.39, "debug-driven" => 0.31 },
        "project_categories" => { "saas_b2b" => 1.0 },
        "workflow_metrics" => {
          "test_after_ratio" => 0.39,
          "bash_to_read_ratio" => 2.5,
          "session_avg_duration_min" => 18.0,
          "tool_variety_avg" => 4.2,
        },
        "sessions_analyzed" => 847,
        "period_days" => 90,
      },
    }
  end

  let(:v2_inner) do
    {
      "created_at" => "2026-05-14T10:32:00+00:00",
      "devprofile_version" => "0.3.0",
      "previous_hash" => nil,
      "scores" => base_scores,
      "l1" => {
        "total_repos" => 12,
        "total_commits" => 4832,
        "earliest_commit" => "2019-03-10T09:00:00+00:00",
        "latest_commit" => "2025-11-20T18:00:00+00:00",
        "ecosystems" => { "rails" => true, "python" => true, "node" => true },
        "platforms" => { "docker" => true, "github" => true, "terraform" => true },
        "avg_test_ratio" => 0.42,
        "root_commit_hashes" => ["a" * 40, "b" * 40],
      },
      "l2" => {
        "platforms" => { "github" => 10 },
        "ecosystems" => { "node" => 5, "python" => 3 },
        "workflow_distribution" => { "tdd" => 0.23, "test-after" => 0.39, "debug-driven" => 0.31 },
        "project_categories" => {},
        "workflow_metrics" => {
          "test_after_ratio" => 0.39,
          "bash_to_read_ratio" => 2.5,
          "session_avg_duration_min" => 18.0,
          "tool_variety_avg" => 4.2,
          "test_first_ratio" => 0, "median_test_delay_min" => 0,
          "edit_to_test_lag_min" => 0, "prompt_avg_chars" => 0,
          "prompt_median_chars" => 0, "ecosystem_concentration" => 0,
        },
        "sessions_analyzed" => 847,
        "period_days" => 90,
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

  def hex_seed(seed)
    chars = ("0".."9").to_a + ("a".."f").to_a
    seed.to_s.each_char.map { |c| chars.include?(c) ? c : chars[c.ord % chars.size] }.join.ljust(64, "0")[0, 64]
  end

  def wrap(inner, hash_seed: "a")
    {
      "version" => inner.key?("l1") ? "2" : "1",
      "payload" => inner,
      "hash" => "sha256:" + hex_seed(hash_seed),
      "signature" => "ed25519:" + ("b" * 128),
      "public_key" => "ed25519:" + ("x" * 43),
    }
  end

  def create_bundle(inner, hash_seed: "a", expires_at: nil)
    Bundle.create!(
      bundle_hash: "sha256:" + hex_seed(hash_seed),
      public_key: "ed25519:" + ("x" * 43),
      payload: wrap(inner, hash_seed: hash_seed),
      expires_at: expires_at,
    )
  end

  # ── score color buckets in the stats grid ──────────────────────────────────

  it "exibe barra verde nas dimensões com score >= 75" do
    inner = v2_inner.deep_dup
    inner["scores"]["overall"] = 80
    inner["scores"]["prompt_quality"] = 88
    b = create_bundle(inner, hash_seed: "1")
    visit "/v/#{b.short_id}"
    expect(page).to have_css(".stats .stat .stat-bar .fill.fill-green", minimum: 1)
  end

  it "exibe barra amarela nas dimensões com score 50-74" do
    inner = v2_inner.deep_dup
    inner["scores"]["prompt_quality"] = 60
    inner["scores"]["test_maturity"] = 50
    inner["scores"]["tech_breadth"] = 90
    inner["scores"]["growth_rate"] = 90
    b = create_bundle(inner, hash_seed: "2")
    visit "/v/#{b.short_id}"
    expect(page).to have_css(".stats .stat .stat-bar .fill.fill-yellow", minimum: 1)
  end

  it "exibe barra vermelha nas dimensões com score < 50" do
    inner = v2_inner.deep_dup
    inner["scores"]["prompt_quality"] = 30
    inner["scores"]["test_maturity"] = 40
    b = create_bundle(inner, hash_seed: "3")
    visit "/v/#{b.short_id}"
    expect(page).to have_css(".stats .stat .stat-bar .fill.fill-red", minimum: 1)
  end

  it "exibe overall score como número grande no header" do
    inner = v2_inner.deep_dup
    inner["scores"]["overall"] = 74
    b = create_bundle(inner, hash_seed: "4")
    visit "/v/#{b.short_id}"
    expect(page).to have_css(".overall-number", text: "74")
  end

  # ── L1 / L2 sections (UI refinada) ─────────────────────────────────────────

  it "exibe seção L1 com repos, commits, ecosystems e chips para bundle v2 preenchido" do
    b = create_bundle(v2_inner, hash_seed: "5")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Git History Analysis")
    expect(page).to have_content("Total Repositories")
    expect(page).to have_content("12")
    expect(page).to have_content("Total Commits")
    expect(page).to have_content("4,832")
    expect(page).to have_content("2019 → 2025")
    expect(page).to have_content("0.42") # avg_test_ratio
    # Chips para ecosystems (com sufixo ": true" como na maquete)
    expect(page).to have_css(".chip", text: /python: true/)
    expect(page).to have_css(".chip", text: /rails: true/)
  end

  it "exibe estado vazio do L1 quando total_repos == 0" do
    b = create_bundle(l1_empty_inner, hash_seed: "6")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Git History Analysis")
    expect(page).to have_content("Bootstrap não realizado")
  end

  it "exibe seção L2 com sessions analyzed e métricas de workflow para v2" do
    b = create_bundle(v2_inner, hash_seed: "7")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Agentic Workflow Metrics")
    expect(page).to have_content("847")
    expect(page).to have_content("90 days")
    expect(page).to have_content("Test-after Ratio")
  end

  it "exibe estado L1_ONLY quando o bundle tem L1 preenchido mas L2 vazio (sessions_analyzed == 0)" do
    inner = v2_inner.deep_dup
    inner["l2"]["sessions_analyzed"] = 0
    b = create_bundle(inner, hash_seed: "8")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("L1_ONLY Profile")
    expect(page).to have_content("No Claude Code session telemetry")
  end

  it "renderiza L2 com signals para bundle v1" do
    b = create_bundle(v1_inner, hash_seed: "9")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Agentic Workflow Metrics")
    expect(page).to have_content("847")
    expect(page).to have_content("90 days")
  end

  # ── trend chart (chain history) ────────────────────────────────────────────

  it "mostra mensagem de chain única quando há apenas 1 snapshot" do
    b = create_bundle(v2_inner, hash_seed: "a")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Apenas 1 snapshot na cadeia")
  end

  it "renderiza chart SVG e stats quando há pelo menos 2 snapshots na chain" do
    # Genesis snapshot
    inner1 = v2_inner.deep_dup
    inner1["scores"]["overall"] = 65
    inner1["created_at"] = "2025-12-01T10:00:00+00:00"
    inner1["previous_hash"] = nil
    b1 = create_bundle(inner1, hash_seed: "b")

    # Second snapshot referencing the first
    inner2 = v2_inner.deep_dup
    inner2["scores"]["overall"] = 72
    inner2["created_at"] = "2026-05-01T10:00:00+00:00"
    inner2["previous_hash"] = b1.bundle_hash
    b2 = create_bundle(inner2, hash_seed: "c")

    visit "/v/#{b2.short_id}"
    expect(page).to have_css(".chart-wrap svg")
    expect(page).to have_content("Net Δ")
    expect(page).to have_content("Consistency")
  end

  # ── verification block ────────────────────────────────────────────────────

  it "embute o bundle JSON inline e o placeholder VERIFYING para o JS atualizar" do
    b = create_bundle(v2_inner, hash_seed: "d")
    visit "/v/#{b.short_id}"
    expect(page).to have_css("script#bundle-data", visible: :all)
    expect(page).to have_content("SIG_MATCH: VERIFYING…")
    expect(page).to have_content("ED25519 PROFILE") # pill placeholder before JS runs
  end

  it "expõe SHA256 / ED25519 / PUB_KEY na footer Proof of Authenticity" do
    b = create_bundle(v2_inner, hash_seed: "e")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Proof of Authenticity")
    expect(page).to have_content("SHA256")
    expect(page).to have_content("ED25519")
    expect(page).to have_content("PUB_KEY")
    expect(page).to have_content("ISSUED")
  end

  # ── expiration banner ─────────────────────────────────────────────────────

  it "exibe aviso de expiração para bundle com TTL vencido" do
    b = create_bundle(v2_inner, hash_seed: "f", expires_at: 1.day.ago)
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Este perfil expirou")
    # Conteúdo continua visível — banner é aviso, não bloqueio.
    expect(page).to have_content("Git History Analysis")
  end

  # ── privacy invariants ────────────────────────────────────────────────────

  it "não exibe nomes de repositório em nenhum lugar da página" do
    b = create_bundle(v2_inner, hash_seed: "0")
    visit "/v/#{b.short_id}"
    visible = page.find("body").text
    expect(visible).not_to include("github.com")
    expect(visible).not_to match(%r{/[\w-]+/[\w-]+})
    expect(visible).not_to include("repo_name")
  end

  it "não exibe root_commit_hashes como lista visível" do
    # Use unique-looking hashes that can't accidentally substring the signature
    # fixture. The signature is "b" * 128, so "a"/"b" 40-char hashes would
    # match it; "1"/"2"-only hashes can't.
    inner = v2_inner.deep_dup
    inner["l1"]["root_commit_hashes"] = ["1" * 40, "2" * 40]
    b = create_bundle(inner, hash_seed: "1")
    visit "/v/#{b.short_id}"
    visible = page.find("body").text
    expect(visible).not_to include("1" * 40)
    expect(visible).not_to include("2" * 40)
  end
end
