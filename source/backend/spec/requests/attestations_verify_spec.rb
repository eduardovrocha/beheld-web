require "rails_helper"

RSpec.describe "POST /api/attestation/verify (Phase 5 / F5.6.1)", type: :request do
  let(:fixtures_root) { Rails.root.join("spec/fixtures/platform_keys") }

  # Real Ed25519 keypair, then a fake fixture directory matching the test keys.
  let(:raw_priv)  { Random.bytes(32) }
  let(:priv_pkey) { OpenSSL::PKey.new_raw_private_key("ED25519", raw_priv) }
  let(:pub_b64)   { Base64.strict_encode64(priv_pkey.raw_public_key) }

  let(:test_platform_keys) do
    [{
      "key_id"         => "test-platform-key",
      "algorithm"      => "ed25519",
      "public_key"     => "ed25519-pub:#{pub_b64}",
      "active"         => true,
      "revoked"        => false,
      "created_at"     => "2026-01-01T00:00:00Z",
      "rotated_at"     => nil,
      "revoked_at"     => nil,
      "revoked_reason" => nil,
    }]
  end

  before do
    allow(PlatformKey).to receive(:all).and_return(test_platform_keys)
  end

  let(:payload) do
    Attestation.build_payload(
      dev_pubkey_b64:  "ao/AsOyFTMrORd9irGlQjbxI5C7Qb4TfZVi7sgnoyio=",
      github_user_id:  12345,
      github_login:    "octocat",
      platform_key_id: "test-platform-key",
      attested_at:     Time.zone.parse("2026-05-19T18:00:00Z"),
    )
  end

  def sign_payload(p)
    signer = PlatformKeySigner.new(key_id: "test-platform-key", raw_private_key: raw_priv)
    _, sig_b64 = signer.sign(p)
    sig_b64
  end

  it "retorna 200 com payload_valid + signature_valid + key_status=active pra attestation legítima" do
    sig_b64 = sign_payload(payload)
    post "/api/attestation/verify", params: {
      payload: payload, signature: "ed25519:#{sig_b64}",
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["payload_valid"]).to be(true)
    expect(body["signature_valid"]).to be(true)
    expect(body["key_status"]).to eq("active")
    expect(body["platform_key_id"]).to eq("test-platform-key")
    expect(body["github"]).to eq({
      "user_id"     => 12345,
      "login"       => "octocat",
      "verified_at" => "2026-05-19T18:00:00Z",
    })
    expect(body["error"]).to be_nil
  end

  it "retorna signature_valid=false quando payload foi adulterado" do
    sig_b64 = sign_payload(payload)
    tampered = payload.merge("github" => payload["github"].merge("login" => "evil"))
    post "/api/attestation/verify", params: {
      payload: tampered, signature: "ed25519:#{sig_b64}",
    }.to_json, headers: { "Content-Type" => "application/json" }

    body = JSON.parse(response.body)
    expect(body["signature_valid"]).to be(false)
    expect(body["payload_valid"]).to be(true)
  end

  it "retorna key_status=unknown quando platform_key_id não existe no registro" do
    payload2 = payload.merge("platform_key_id" => "ghost-key")
    sig_b64  = sign_payload(payload2)
    post "/api/attestation/verify", params: {
      payload: payload2, signature: "ed25519:#{sig_b64}",
    }.to_json, headers: { "Content-Type" => "application/json" }

    body = JSON.parse(response.body)
    expect(body["payload_valid"]).to be(true)
    expect(body["signature_valid"]).to be(false)
    expect(body["key_status"]).to eq("unknown")
  end

  it "retorna 400 quando body não é JSON válido" do
    post "/api/attestation/verify", params: "not json {{",
         headers: { "Content-Type" => "application/json" }
    expect(response).to have_http_status(:bad_request)
  end

  it "retorna payload_valid=false quando payload missing campos" do
    post "/api/attestation/verify", params: {
      payload: { "type" => "devprofile-identity-attestation/v1" },
      signature: "ed25519:AAAA",
    }.to_json, headers: { "Content-Type" => "application/json" }

    body = JSON.parse(response.body)
    expect(body["payload_valid"]).to be(false)
    expect(body["error"]).to include("missing")
  end
end
