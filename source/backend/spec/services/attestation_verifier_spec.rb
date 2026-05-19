require "rails_helper"

RSpec.describe AttestationVerifier do
  # Generate a real Ed25519 keypair so signatures actually verify.
  let(:raw_priv) { Random.bytes(32) }
  let(:priv_pkey) { OpenSSL::PKey.new_raw_private_key("ED25519", raw_priv) }
  let(:pub_b64)   { Base64.strict_encode64(priv_pkey.raw_public_key) }

  def build_key(key_id:, active: true, revoked: false, revoked_reason: nil, public_key: pub_b64)
    {
      "key_id"         => key_id,
      "algorithm"      => "ed25519",
      "public_key"     => "ed25519-pub:#{public_key}",
      "active"         => active,
      "revoked"        => revoked,
      "created_at"     => "2026-01-01T00:00:00Z",
      "rotated_at"     => nil,
      "revoked_at"     => revoked ? "2026-04-21T03:00:00Z" : nil,
      "revoked_reason" => revoked_reason,
    }
  end

  def sign(payload, raw_priv_key: raw_priv)
    signer = PlatformKeySigner.new(key_id: "k", raw_private_key: raw_priv_key)
    canonical, sig_b64 = signer.sign(payload)
    [canonical, sig_b64]
  end

  let(:dev_pubkey_b64) { "ao/AsOyFTMrORd9irGlQjbxI5C7Qb4TfZVi7sgnoyio=" }

  let(:valid_payload) do
    Attestation.build_payload(
      dev_pubkey_b64:  dev_pubkey_b64,
      github_user_id:  12345,
      github_login:    "octocat",
      platform_key_id: "k-active",
      attested_at:     Time.zone.parse("2026-05-19T18:00:00Z"),
    )
  end

  describe "valid attestation paths" do
    let(:keys) { [build_key(key_id: "k-active")] }

    it "retorna payload_valid + signature_valid + key_status=active" do
      _, sig_b64 = sign(valid_payload)
      attestation = { "payload" => valid_payload, "signature" => "ed25519:#{sig_b64}" }

      result = described_class.verify(attestation, platform_keys: keys)
      expect(result.payload_valid).to be(true)
      expect(result.signature_valid).to be(true)
      expect(result.key_status).to eq("active")
      expect(result.platform_key_id).to eq("k-active")
      expect(result.github).to eq({
        "user_id"     => 12345,
        "login"       => "octocat",
        "verified_at" => "2026-05-19T18:00:00Z",
      })
      expect(result.error).to be_nil
    end
  end

  describe "key status cascade" do
    it "marca key_status=rotated quando key.active=false e revoked=false" do
      payload = valid_payload.merge("platform_key_id" => "k-rotated")
      keys = [build_key(key_id: "k-rotated", active: false, revoked: false)]
      _, sig_b64 = sign(payload)

      result = described_class.verify(
        { "payload" => payload, "signature" => "ed25519:#{sig_b64}" },
        platform_keys: keys,
      )
      expect(result.signature_valid).to be(true)
      expect(result.key_status).to eq("rotated")
    end

    it "marca key_status=revoked + revoked_reason quando key.revoked=true" do
      payload = valid_payload.merge("platform_key_id" => "k-revoked")
      keys = [build_key(
        key_id: "k-revoked", active: false, revoked: true,
        revoked_reason: "exposed in CI log",
      )]
      _, sig_b64 = sign(payload)

      result = described_class.verify(
        { "payload" => payload, "signature" => "ed25519:#{sig_b64}" },
        platform_keys: keys,
      )
      expect(result.signature_valid).to be(true)
      expect(result.key_status).to eq("revoked")
      expect(result.revoked_reason).to eq("exposed in CI log")
    end

    it "marca key_status=unknown + signature_valid=false quando platform_key_id não existe no registro" do
      _, sig_b64 = sign(valid_payload)
      result = described_class.verify(
        { "payload" => valid_payload, "signature" => "ed25519:#{sig_b64}" },
        platform_keys: [],
      )
      expect(result.payload_valid).to be(true)
      expect(result.signature_valid).to be(false)
      expect(result.key_status).to eq("unknown")
      expect(result.error).to include("unknown platform_key_id")
    end
  end

  describe "signature failures" do
    let(:keys) { [build_key(key_id: "k-active")] }

    it "signature_valid=false quando signature foi assinada com chave diferente" do
      other_priv = Random.bytes(32)
      _, sig_b64 = sign(valid_payload, raw_priv_key: other_priv)
      result = described_class.verify(
        { "payload" => valid_payload, "signature" => "ed25519:#{sig_b64}" },
        platform_keys: keys,
      )
      expect(result.signature_valid).to be(false)
      expect(result.key_status).to eq("active") # key is still valid; just signature mismatch
    end

    it "signature_valid=false quando payload foi adulterado pós-assinatura" do
      _, sig_b64 = sign(valid_payload)
      tampered = valid_payload.merge("github" => valid_payload["github"].merge("login" => "evil"))
      result = described_class.verify(
        { "payload" => tampered, "signature" => "ed25519:#{sig_b64}" },
        platform_keys: keys,
      )
      expect(result.signature_valid).to be(false)
    end

    it "signature_valid=false e error descritivo quando signature tem formato malformado" do
      result = described_class.verify(
        { "payload" => valid_payload, "signature" => "not-a-signature" },
        platform_keys: keys,
      )
      expect(result.payload_valid).to be(true)
      expect(result.signature_valid).to be(false)
      expect(result.error).to include("malformed signature")
    end
  end

  describe "payload shape failures" do
    let(:keys) { [build_key(key_id: "k-active")] }

    it "payload_valid=false quando atestação não é hash" do
      result = described_class.verify("not a hash", platform_keys: keys)
      expect(result.payload_valid).to be(false)
      expect(result.error).to include("not an object")
    end

    it "payload_valid=false quando payload é null" do
      result = described_class.verify({ "payload" => nil, "signature" => "ed25519:AAAA" }, platform_keys: keys)
      expect(result.payload_valid).to be(false)
    end

    it "payload_valid=false quando faltam campos requeridos" do
      result = described_class.verify(
        { "payload" => { "type" => described_class::EXPECTED_TYPE }, "signature" => "ed25519:AAAA" },
        platform_keys: keys,
      )
      expect(result.payload_valid).to be(false)
      expect(result.error).to include("missing fields")
    end

    it "payload_valid=false quando type não é o esperado" do
      payload = valid_payload.merge("type" => "wrong/type")
      result = described_class.verify(
        { "payload" => payload, "signature" => "ed25519:AAAA" },
        platform_keys: keys,
      )
      expect(result.payload_valid).to be(false)
      expect(result.error).to include("unsupported payload type")
    end

    it "payload_valid=false quando github não tem user_id/login/verified_at" do
      payload = valid_payload.merge("github" => { "user_id" => 1 })
      result = described_class.verify(
        { "payload" => payload, "signature" => "ed25519:AAAA" },
        platform_keys: keys,
      )
      expect(result.payload_valid).to be(false)
      expect(result.error).to include("github missing")
    end
  end
end
