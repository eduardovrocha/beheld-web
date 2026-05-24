require "rails_helper"

# F_UNINSTALL — `beheld delete --remote` posts a self-signed revocation here.

RSpec.describe "POST /api/attestation/revoke", type: :request do
  let(:raw_dev_priv)  { Random.bytes(32) }
  let(:dev_pkey)      { OpenSSL::PKey.new_raw_private_key("ED25519", raw_dev_priv) }
  let(:dev_pub_raw)   { dev_pkey.raw_public_key }
  let(:dev_pub_b64)   { Base64.strict_encode64(dev_pub_raw) }
  let(:dev_pub_hex)   { dev_pub_raw.unpack1("H*") }
  let(:dev_fp)        { Digest::SHA256.hexdigest(dev_pub_raw) }

  let(:attested_at)   { Time.zone.parse("2026-05-19T18:00:00Z") }
  let(:issued_at_iso) { attested_at.utc.iso8601 }

  # A real persisted attestation. Signed payload bytes don't matter for the
  # revoke flow — only dev_pubkey_fingerprint + attested_at are looked up.
  let!(:attestation) do
    Attestation.create!(
      dev_pubkey_b64:         dev_pub_b64,
      dev_pubkey_fingerprint: dev_fp,
      github_user_id:         12345,
      github_login:           "octocat",
      platform_key_id:        "test-platform-key",
      signed_payload_json:    "{}",
      signature_b64:          "X" * 86,
      attested_at:            attested_at,
    )
  end

  def sign_revocation(issued_at: issued_at_iso, timestamp: Time.current.utc.iso8601)
    canonical = PlatformKeySigner.canonicalize(
      "action"    => "revoke",
      "issued_at" => issued_at,
      "timestamp" => timestamp,
    )
    signature = dev_pkey.sign(nil, canonical)
    [signature.unpack1("H*"), timestamp]
  end

  it "200 + revoked: true + atualiza revoked_at quando a assinatura confere" do
    sig_hex, ts = sign_revocation
    post "/api/attestation/revoke", params: {
      public_key: dev_pub_hex, issued_at: issued_at_iso,
      timestamp: ts, signed_revocation: sig_hex,
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["revoked"]).to be(true)
    expect(body["revoked_at"]).to be_present
    expect(attestation.reload.revoked_at).not_to be_nil
  end

  it "200 + already_revoked: true em chamadas idempotentes" do
    attestation.update!(revoked_at: 1.minute.ago)
    sig_hex, ts = sign_revocation
    post "/api/attestation/revoke", params: {
      public_key: dev_pub_hex, issued_at: issued_at_iso,
      timestamp: ts, signed_revocation: sig_hex,
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["already_revoked"]).to be(true)
  end

  it "422 quando a assinatura não confere com a public_key" do
    other_priv  = OpenSSL::PKey.new_raw_private_key("ED25519", Random.bytes(32))
    timestamp   = Time.current.utc.iso8601
    canonical   = PlatformKeySigner.canonicalize(
      "action" => "revoke", "issued_at" => issued_at_iso, "timestamp" => timestamp,
    )
    bad_sig_hex = other_priv.sign(nil, canonical).unpack1("H*")

    post "/api/attestation/revoke", params: {
      public_key: dev_pub_hex, issued_at: issued_at_iso,
      timestamp: timestamp, signed_revocation: bad_sig_hex,
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error"]).to match(/does not verify/)
    expect(attestation.reload.revoked_at).to be_nil
  end

  it "404 quando a public_key não corresponde a nenhuma attestation" do
    other_priv = OpenSSL::PKey.new_raw_private_key("ED25519", Random.bytes(32))
    other_hex  = other_priv.raw_public_key.unpack1("H*")
    sig_hex, ts = sign_revocation

    post "/api/attestation/revoke", params: {
      public_key: other_hex, issued_at: issued_at_iso,
      timestamp: ts, signed_revocation: sig_hex,
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:not_found)
    expect(JSON.parse(response.body)["error"]).to match(/not found/)
  end

  it "422 quando o timestamp está fora da janela de ±10min" do
    stale_ts  = (Time.current - 1.hour).utc.iso8601
    sig_hex, ts = sign_revocation(timestamp: stale_ts)

    post "/api/attestation/revoke", params: {
      public_key: dev_pub_hex, issued_at: issued_at_iso,
      timestamp: ts, signed_revocation: sig_hex,
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error"]).to match(/outside ±/)
    expect(attestation.reload.revoked_at).to be_nil
  end

  it "422 quando issued_at não bate com o stored attested_at (anti-replay-with-victim)" do
    sig_hex, ts = sign_revocation(issued_at: "2030-01-01T00:00:00Z")

    post "/api/attestation/revoke", params: {
      public_key: dev_pub_hex, issued_at: "2030-01-01T00:00:00Z",
      timestamp: ts, signed_revocation: sig_hex,
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error"]).to match(/issued_at does not match/)
  end
end
