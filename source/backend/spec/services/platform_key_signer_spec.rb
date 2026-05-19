require "rails_helper"

RSpec.describe PlatformKeySigner do
  describe ".canonicalize" do
    it "ordena chaves recursivamente em objetos aninhados" do
      input = { "b" => 1, "a" => { "d" => 2, "c" => 3 } }
      expect(described_class.canonicalize(input)).to eq('{"a":{"c":3,"d":2},"b":1}')
    end

    it "preserva ordem de elementos em arrays" do
      expect(described_class.canonicalize({ "list" => [3, 1, 2] })).to eq('{"list":[3,1,2]}')
    end

    it "ordena chaves dentro de objetos contidos em arrays" do
      input = { "items" => [{ "b" => 2, "a" => 1 }] }
      expect(described_class.canonicalize(input)).to eq('{"items":[{"a":1,"b":2}]}')
    end

    it "normaliza symbol keys para string keys" do
      expect(described_class.canonicalize({ a: 1, b: 2 })).to eq('{"a":1,"b":2}')
    end

    it "preserva null como JSON null" do
      expect(described_class.canonicalize({ "x" => nil })).to eq('{"x":null}')
    end

    it "preserva booleans" do
      expect(described_class.canonicalize({ "ok" => true, "bad" => false })).to eq('{"bad":false,"ok":true}')
    end
  end

  describe ".from_env" do
    let(:valid_seed_b64) { Base64.strict_encode64("\x00" * 32) }

    around do |ex|
      key_id_was = ENV["DEVPROFILE_PLATFORM_KEY_ID"]
      priv_was   = ENV["DEVPROFILE_PLATFORM_PRIVATE_KEY"]
      ENV["DEVPROFILE_PLATFORM_KEY_ID"]      = "test-key-id"
      ENV["DEVPROFILE_PLATFORM_PRIVATE_KEY"] = valid_seed_b64
      ex.run
      ENV["DEVPROFILE_PLATFORM_KEY_ID"]      = key_id_was
      ENV["DEVPROFILE_PLATFORM_PRIVATE_KEY"] = priv_was
    end

    it "carrega o signer com key_id do env" do
      expect(described_class.from_env.key_id).to eq("test-key-id")
    end

    it "estoura MissingConfiguration quando KEY_ID está vazia" do
      ENV["DEVPROFILE_PLATFORM_KEY_ID"] = ""
      expect { described_class.from_env }.to raise_error(
        PlatformKeySigner::MissingConfiguration, /DEVPROFILE_PLATFORM_KEY_ID/,
      )
    end

    it "estoura MissingConfiguration quando PRIVATE_KEY está ausente" do
      ENV.delete("DEVPROFILE_PLATFORM_PRIVATE_KEY")
      expect { described_class.from_env }.to raise_error(
        PlatformKeySigner::MissingConfiguration, /DEVPROFILE_PLATFORM_PRIVATE_KEY/,
      )
    end

    it "estoura InvalidKey quando seed não tem 32 bytes" do
      ENV["DEVPROFILE_PLATFORM_PRIVATE_KEY"] = Base64.strict_encode64("too short")
      expect { described_class.from_env }.to raise_error(PlatformKeySigner::InvalidKey, /32-byte/)
    end

    it "estoura InvalidKey quando seed não é base64 válido" do
      ENV["DEVPROFILE_PLATFORM_PRIVATE_KEY"] = "$$$ not base64 $$$"
      expect { described_class.from_env }.to raise_error(PlatformKeySigner::InvalidKey, /base64/)
    end
  end

  describe "#sign" do
    let(:raw_priv) { Random.bytes(32) }
    let(:signer)   { described_class.new(key_id: "k", raw_private_key: raw_priv) }

    it "produz canonical determinístico e signature que valida com a public key derivada" do
      payload = { "b" => 2, "a" => 1 }
      canonical, sig_b64 = signer.sign(payload)
      expect(canonical).to eq('{"a":1,"b":2}')

      pkey   = OpenSSL::PKey.new_raw_private_key("ED25519", raw_priv)
      pub    = OpenSSL::PKey.new_raw_public_key("ED25519", pkey.raw_public_key)
      sigbin = Base64.strict_decode64(sig_b64)
      expect(pub.verify(nil, sigbin, canonical)).to be(true)
    end

    it "produz assinaturas determinísticas pra o mesmo payload (Ed25519 é determinístico)" do
      payload = { "x" => 1 }
      expect(signer.sign(payload)).to eq(signer.sign(payload))
    end

    it "produz assinaturas distintas pra payloads distintos" do
      _, sig_a = signer.sign({ "x" => 1 })
      _, sig_b = signer.sign({ "x" => 2 })
      expect(sig_a).not_to eq(sig_b)
    end

    it "estoura ArgumentError quando seed não tem 32 bytes" do
      expect { described_class.new(key_id: "k", raw_private_key: "short") }.to raise_error(OpenSSL::PKey::PKeyError)
    end
  end
end
