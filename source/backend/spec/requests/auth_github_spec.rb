require "rails_helper"
require "mock_redis"

RSpec.describe "Auth GitHub OAuth flow (Phase 5 / F5.6.1)", type: :request do
  let(:mock_redis) { MockRedis.new }
  let(:store)      { OauthStateStore.new(redis: mock_redis) }
  let(:dev_pubkey) { "ed25519-pub:ao/AsOyFTMrORd9irGlQjbxI5C7Qb4TfZVi7sgnoyio=" }

  # Sample raw Ed25519 seed for the platform signer (deterministic across tests).
  let(:platform_seed)   { "\xAA" * 32 }
  let(:platform_seed_b64) { Base64.strict_encode64(platform_seed) }

  around do |ex|
    cid_was      = ENV["GITHUB_OAUTH_CLIENT_ID"]
    csec_was     = ENV["GITHUB_OAUTH_CLIENT_SECRET"]
    kid_was      = ENV["BEHELD_PLATFORM_KEY_ID"]
    priv_was     = ENV["BEHELD_PLATFORM_PRIVATE_KEY"]

    ENV["GITHUB_OAUTH_CLIENT_ID"]         = "test-cid"
    ENV["GITHUB_OAUTH_CLIENT_SECRET"]     = "test-csec"
    ENV["BEHELD_PLATFORM_KEY_ID"]     = "test-platform-key"
    ENV["BEHELD_PLATFORM_PRIVATE_KEY"] = platform_seed_b64

    ex.run

    ENV["GITHUB_OAUTH_CLIENT_ID"]         = cid_was
    ENV["GITHUB_OAUTH_CLIENT_SECRET"]     = csec_was
    ENV["BEHELD_PLATFORM_KEY_ID"]     = kid_was
    ENV["BEHELD_PLATFORM_PRIVATE_KEY"] = priv_was
  end

  before do
    allow(OauthStateStore).to receive(:new).and_return(store)
  end

  describe "GET /api/auth/github/start" do
    let(:valid_params) do
      { cli_state: "a" * 24, cli_port: 53432, dev_pubkey: dev_pubkey }
    end

    it "redireciona pro GitHub authorize URL com state, redirect_uri e scope" do
      get "/api/auth/github/start", params: valid_params
      expect(response).to have_http_status(:found)
      expect(response.location).to start_with("https://github.com/login/oauth/authorize?")
      expect(response.location).to include("client_id=test-cid")
      expect(response.location).to include("scope=read%3Auser")
      expect(response.location).to include("redirect_uri=")
    end

    it "persiste o pending state no store sob a gh_state retornada na URL" do
      get "/api/auth/github/start", params: valid_params
      gh_state = CGI.parse(URI(response.location).query)["state"].first
      pending = store.take_pending(gh_state)
      expect(pending).to eq({
        "cli_state"  => "a" * 24,
        "cli_port"   => 53432,
        "dev_pubkey" => dev_pubkey,
      })
    end

    it "rejeita cli_state malformado" do
      get "/api/auth/github/start", params: valid_params.merge(cli_state: '!@#$')
      expect(response).to have_http_status(:bad_request)
      expect(response.body).to include("cli_state")
    end

    it "rejeita cli_port fora do range válido" do
      get "/api/auth/github/start", params: valid_params.merge(cli_port: 80)
      expect(response).to have_http_status(:bad_request)
      expect(response.body).to include("cli_port")
    end

    it "rejeita dev_pubkey sem prefixo ed25519-pub:" do
      get "/api/auth/github/start", params: valid_params.merge(dev_pubkey: "not-a-key")
      expect(response).to have_http_status(:bad_request)
      expect(response.body).to include("dev_pubkey")
    end
  end

  describe "GET /api/auth/github/callback" do
    let(:gh_state) { "gh-state-fixture" }

    before do
      store.put_pending(gh_state, {
        "cli_state"  => "cli-state-xyz" * 2,
        "cli_port"   => 53432,
        "dev_pubkey" => dev_pubkey,
      })

      stub_request(:post, "https://github.com/login/oauth/access_token").to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: { access_token: "gho_test_token", token_type: "bearer", scope: "read:user" }.to_json,
      )
      stub_request(:get, "https://api.github.com/user").to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: { id: 12345, login: "octocat" }.to_json,
      )
    end

    it "completa o flow: cria Attestation, redireciona pro loopback com claim_code" do
      expect {
        get "/api/auth/github/callback", params: { code: "good-code", state: gh_state }
      }.to change { Attestation.count }.by(1)

      expect(response).to have_http_status(:found)
      expect(response.location).to start_with("http://localhost:53432/callback?")
      expect(response.location).to include("claim_code=")
      expect(response.location).to include("cli_state=")

      attestation = Attestation.last
      expect(attestation.github_user_id).to eq(12345)
      expect(attestation.github_login).to eq("octocat")
      expect(attestation.platform_key_id).to eq("test-platform-key")
    end

    it "persiste claim no store com a attestation JSON" do
      get "/api/auth/github/callback", params: { code: "good-code", state: gh_state }
      claim_code = CGI.parse(URI(response.location).query)["claim_code"].first
      payload = store.take_claim(claim_code)
      expect(payload).not_to be_nil
      expect(payload["payload"]["github"]["login"]).to eq("octocat")
      expect(payload["signature"]).to start_with("ed25519:")
    end

    it "rejeita callback com state desconhecida (não foi precedida de /start)" do
      get "/api/auth/github/callback", params: { code: "x", state: "unknown-state" }
      expect(response).to have_http_status(:bad_request)
      expect(response.body).to include("state")
    end

    it "consome pending state — replay falha" do
      get "/api/auth/github/callback", params: { code: "good-code", state: gh_state }
      # Re-stub for second call
      stub_request(:post, "https://github.com/login/oauth/access_token").to_return(
        status: 200, headers: { "Content-Type" => "application/json" },
        body: { access_token: "x" }.to_json,
      )
      get "/api/auth/github/callback", params: { code: "good-code", state: gh_state }
      expect(response).to have_http_status(:bad_request)
    end

    it "retorna bad_gateway quando GitHub recusa o code" do
      store.put_pending(gh_state, {
        "cli_state" => "cli-state-xyz" * 2, "cli_port" => 53432, "dev_pubkey" => dev_pubkey,
      })
      stub_request(:post, "https://github.com/login/oauth/access_token").to_return(
        status: 200, headers: { "Content-Type" => "application/json" },
        body: { error: "bad_verification_code", error_description: "expired" }.to_json,
      )
      get "/api/auth/github/callback", params: { code: "bad", state: gh_state }
      expect(response).to have_http_status(:bad_gateway)
      expect(response.body).to include("bad_verification_code")
    end
  end
end
