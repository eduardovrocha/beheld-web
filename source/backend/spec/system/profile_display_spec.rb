require "rails_helper"
require "capybara/rspec"

# Driver intencional: rack_test renders HTML without JavaScript.  Validates
# the "scores e sinais devem ser visíveis mesmo sem JS" requirement.  A
# separate scenario (`exibe placeholder de verificação`) asserts that the JS
# block is wired up so a browser would execute it.
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
        "workflow_metrics" => {},
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
        "workflow_metrics" => {},
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

  def wrap(inner, hash_seed: "a")
    {
      "version" => inner.key?("l1") ? "2" : "1",
      "payload" => inner,
      "hash" => "sha256:" + (hash_seed * 64)[0, 64],
      "signature" => "ed25519:" + ("b" * 128),
      "public_key" => "ed25519:" + ("x" * 43),
    }
  end

  def create_bundle(inner, hash_seed: "a", expires_at: nil)
    Bundle.create!(
      bundle_hash: "sha256:" + (hash_seed * 64)[0, 64],
      public_key: "ed25519:" + ("x" * 43),
      payload: wrap(inner, hash_seed: hash_seed),
      expires_at: expires_at,
    )
  end

  # ── score color buckets ────────────────────────────────────────────────────

  it "exibe score overall com barra verde para score >= 75" do
    inner = v2_inner.deep_dup
    inner["scores"]["overall"] = 80
    b = create_bundle(inner, hash_seed: "1")
    visit "/v/#{b.short_id}"
    # The overall card has a `.fill.fill-green` element styled with the
    # bucket class — the SVG/badge tests cover the hex; here we assert the
    # CSS hook the layout applies.
    expect(page).to have_css(".overall .fill.fill-green")
  end

  it "exibe score overall com barra amarela para score 50-74" do
    inner = v2_inner.deep_dup
    inner["scores"]["overall"] = 60
    b = create_bundle(inner, hash_seed: "2")
    visit "/v/#{b.short_id}"
    expect(page).to have_css(".overall .fill.fill-yellow")
  end

  it "exibe score overall com barra vermelha para score < 50" do
    inner = v2_inner.deep_dup
    inner["scores"]["overall"] = 30
    b = create_bundle(inner, hash_seed: "3")
    visit "/v/#{b.short_id}"
    expect(page).to have_css(".overall .fill.fill-red")
  end

  # ── L1 / L2 sections ───────────────────────────────────────────────────────

  it "exibe seção L1 com repos e commits para bundle v2 com l1 preenchido" do
    b = create_bundle(v2_inner, hash_seed: "4")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("BASE HISTÓRICA")
    expect(page).to have_content("12 repositórios")
    expect(page).to have_content("4.832 commits")
    expect(page).to have_content("42% arquivos de teste")
    expect(page).to have_content("Mar 2019 → Nov 2025")
  end

  it "exibe aviso de l1 indisponível para bundle v2 com total_repos == 0" do
    b = create_bundle(l1_empty_inner, hash_seed: "5")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("BASE HISTÓRICA")
    expect(page).to have_content("Não disponível — o dev ainda não realizou o Git Bootstrap")
  end

  it "exibe seção signals corretamente para bundle v1" do
    b = create_bundle(v1_inner, hash_seed: "6")
    visit "/v/#{b.short_id}"
    expect(page).to have_content("847 sessões")
    expect(page).to have_content("90 dias")
    # Workflow distribution (top 3 by value) renders for v1 too.
    expect(page).to have_content(/TDD\s+23%/)
    expect(page).to have_content(/Test-after\s+39%/)
  end

  it "exibe label 'Base Histórica' apenas para bundle v2" do
    b1 = create_bundle(v1_inner, hash_seed: "7")
    visit "/v/#{b1.short_id}"
    expect(page).not_to have_content("BASE HISTÓRICA")

    b2 = create_bundle(v2_inner, hash_seed: "8")
    visit "/v/#{b2.short_id}"
    expect(page).to have_content("BASE HISTÓRICA")
  end

  # ── verification block ─────────────────────────────────────────────────────

  it "exibe placeholder de verificação que será atualizado quando o JS rodar" do
    # rack_test doesn't execute JS, so we assert the wiring is there: inline
    # bundle-data JSON + the loading placeholder + the verification script tag.
    b = create_bundle(v2_inner, hash_seed: "9")
    visit "/v/#{b.short_id}"
    expect(page).to have_css("script#bundle-data", visible: :all)
    expect(page).to have_content("Verificando autenticidade…")
    expect(page).to have_content("Chave pública:")
    # The pubkey is truncated for display but the full value is on the copy
    # button's data attribute — no full pubkey visible in plain text.
    truncated = "x" * 16
    expect(page).to have_content(truncated)
  end

  # ── expiration banner ──────────────────────────────────────────────────────

  it "exibe aviso de expiração para bundle com TTL vencido" do
    b = create_bundle(v2_inner, hash_seed: "a", expires_at: 1.day.ago)
    visit "/v/#{b.short_id}"
    expect(page).to have_content("Este perfil expirou")
    # Conteúdo continua visível — banner é aviso, não bloqueio.
    expect(page).to have_content("BASE HISTÓRICA")
  end

  # ── privacy invariants ────────────────────────────────────────────────────

  it "não exibe nomes de repositório em nenhum lugar da página" do
    b = create_bundle(v2_inner, hash_seed: "b")
    visit "/v/#{b.short_id}"
    # The bundle's L1 platforms include "github" as a flag, but no actual
    # repo identifier (org/name, URLs, paths) should appear anywhere.
    visible = page.find("body").text
    expect(visible).not_to include("github.com")
    expect(visible).not_to match(%r{/[\w-]+/[\w-]+})  # org/repo pattern
    expect(visible).not_to include("repo_name")
  end

  it "não exibe root_commit_hashes como lista visível" do
    b = create_bundle(v2_inner, hash_seed: "c")
    visit "/v/#{b.short_id}"
    # The hashes appear inside the inline bundle-data JSON (required for
    # client-side verification) but never as plain page content.
    visible_text = page.find("body").text
    expect(visible_text).not_to include("a" * 40)
    expect(visible_text).not_to include("b" * 40)
  end
end
