require "rails_helper"

RSpec.describe Attestation do
  let(:valid_attrs) do
    {
      dev_pubkey_b64:         "ao/AsOyFTMrORd9irGlQjbxI5C7Qb4TfZVi7sgnoyio=",
      dev_pubkey_fingerprint: "f" * 64,
      github_user_id:         12345,
      github_login:           "octocat",
      platform_key_id:        "devprofile-platform-2026-q2",
      signed_payload_json:    '{"a":1}',
      signature_b64:          "AAAA",
      attested_at:            Time.zone.parse("2026-05-19T18:00:00Z"),
    }
  end

  describe ".build_payload" do
    let(:t) { Time.zone.parse("2026-05-19T18:00:00Z") }

    it "monta payload com type, platform_key_id, dev_pubkey, github e attested_at" do
      payload = described_class.build_payload(
        dev_pubkey_b64:  "AAAA",
        github_user_id:  12345,
        github_login:    "octocat",
        platform_key_id: "devprofile-platform-2026-q2",
        attested_at:     t,
      )
      expect(payload["type"]).to eq("devprofile-identity-attestation/v1")
      expect(payload["platform_key_id"]).to eq("devprofile-platform-2026-q2")
      expect(payload["dev_pubkey"]).to eq("ed25519-pub:AAAA")
      expect(payload["github"]).to eq({
        "user_id"     => 12345,
        "login"       => "octocat",
        "verified_at" => "2026-05-19T18:00:00Z",
      })
      expect(payload["attested_at"]).to eq("2026-05-19T18:00:00Z")
    end

    it "normaliza attested_at pra UTC ISO 8601" do
      non_utc = Time.zone.parse("2026-05-19T15:00:00-03:00")
      payload = described_class.build_payload(
        dev_pubkey_b64: "x", github_user_id: 1, github_login: "u",
        platform_key_id: "k", attested_at: non_utc,
      )
      expect(payload["attested_at"]).to eq("2026-05-19T18:00:00Z")
      expect(payload["github"]["verified_at"]).to eq("2026-05-19T18:00:00Z")
    end
  end

  describe ".fingerprint" do
    it "calcula sha256 hex dos raw 32 bytes decodificados" do
      raw = "\x00" * 32
      expected = Digest::SHA256.hexdigest(raw)
      expect(described_class.fingerprint(Base64.strict_encode64(raw))).to eq(expected)
    end

    it "bate com o fingerprint registrado em keys/platform/devprofile-platform-2026-q2.info.json" do
      pub_b64 = "ao/AsOyFTMrORd9irGlQjbxI5C7Qb4TfZVi7sgnoyio="
      expect(described_class.fingerprint(pub_b64)).to eq(
        "435e50624c8f3cd82406d085bbad152e776c4b25e729e2b61ffd6cbd25d419e6",
      )
    end
  end

  describe "#to_attestation_json" do
    it "expõe payload parseado + signature com prefixo ed25519:" do
      a = described_class.new(valid_attrs)
      json = a.to_attestation_json
      expect(json["payload"]).to eq({ "a" => 1 })
      expect(json["signature"]).to eq("ed25519:AAAA")
    end
  end

  describe "validations" do
    it "salva quando todos os campos requeridos estão presentes" do
      expect(described_class.new(valid_attrs).save).to be(true)
    end

    %i[dev_pubkey_b64 dev_pubkey_fingerprint github_user_id github_login
       platform_key_id signed_payload_json signature_b64 attested_at].each do |field|
      it "exige presença de #{field}" do
        a = described_class.new(valid_attrs.merge(field => nil))
        expect(a).not_to be_valid
        expect(a.errors[field]).to be_present
      end
    end
  end
end
