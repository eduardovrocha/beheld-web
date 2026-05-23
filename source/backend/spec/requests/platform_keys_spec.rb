require "rails_helper"

RSpec.describe "GET /api/platform-keys (Phase 5 / F5.6)", type: :request do
  let(:fixtures_root) { Rails.root.join("spec/fixtures/platform_keys") }

  before do
    allow(PlatformKey).to receive(:default_root).and_return(fixtures_root)
  end

  it "responde 200 com a chave 'keys' contendo array" do
    get "/api/platform-keys"
    expect(response).to have_http_status(:ok)
    expect(response.content_type).to start_with("application/json")
    body = JSON.parse(response.body)
    expect(body).to have_key("keys")
    expect(body["keys"]).to be_an(Array)
  end

  it "retorna as três chaves das fixtures (ciclo completo: rotacionada, ativa, revogada)" do
    get "/api/platform-keys"
    body = JSON.parse(response.body)
    key_ids = body["keys"].map { |k| k["key_id"] }
    expect(key_ids).to contain_exactly(
      "beheld-platform-2026-q1",
      "beheld-platform-2026-q2",
      "beheld-platform-2026-q3",
    )
  end

  it "expõe public_key com prefixo ed25519-pub: pra cada chave" do
    get "/api/platform-keys"
    body = JSON.parse(response.body)
    body["keys"].each do |key|
      expect(key["public_key"]).to start_with("ed25519-pub:")
    end
  end

  it "marca apenas a chave ativa com active=true" do
    get "/api/platform-keys"
    body = JSON.parse(response.body)
    actives = body["keys"].select { |k| k["active"] }
    expect(actives.size).to eq(1)
    expect(actives.first["key_id"]).to eq("beheld-platform-2026-q2")
  end

  it "expõe revoked_at + revoked_reason na chave revogada" do
    get "/api/platform-keys"
    body = JSON.parse(response.body)
    revoked = body["keys"].find { |k| k["revoked"] }
    expect(revoked["key_id"]).to eq("beheld-platform-2026-q3")
    expect(revoked["revoked_at"]).to eq("2026-04-21T03:00:00Z")
    expect(revoked["revoked_reason"]).to be_a(String).and(satisfy { |s| s.length > 0 })
  end

  it "retorna lista vazia quando não há chaves no diretório" do
    Dir.mktmpdir do |tmp|
      allow(PlatformKey).to receive(:default_root).and_return(tmp)
      get "/api/platform-keys"
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq({ "keys" => [] })
    end
  end
end
