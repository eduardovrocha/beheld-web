require "rails_helper"
require "mock_redis"

RSpec.describe "POST /api/attestation/claim (Phase 5 / F5.6.1)", type: :request do
  let(:mock_redis) { MockRedis.new }
  let(:store)      { OauthStateStore.new(redis: mock_redis) }

  before do
    allow(OauthStateStore).to receive(:new).and_return(store)
  end

  let(:attestation_payload) do
    {
      "payload"   => {
        "type"            => "beheld-identity-attestation/v1",
        "platform_key_id" => "test-platform-key",
        "github"          => { "user_id" => 12345, "login" => "octocat" },
      },
      "signature" => "ed25519:AAAA",
    }
  end

  it "retorna a attestation persistida pela callback do OAuth" do
    store.put_claim("good-code", attestation_payload)

    post "/api/attestation/claim", params: { claim_code: "good-code" }
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to eq(attestation_payload)
  end

  it "claim é single-use — segunda chamada retorna 404" do
    store.put_claim("good-code", attestation_payload)
    post "/api/attestation/claim", params: { claim_code: "good-code" }
    expect(response).to have_http_status(:ok)

    post "/api/attestation/claim", params: { claim_code: "good-code" }
    expect(response).to have_http_status(:not_found)
  end

  it "retorna 404 pra claim_code desconhecido" do
    post "/api/attestation/claim", params: { claim_code: "never-issued" }
    expect(response).to have_http_status(:not_found)
  end

  it "retorna 400 quando claim_code está ausente" do
    post "/api/attestation/claim", params: {}
    expect(response).to have_http_status(:bad_request)
  end
end
