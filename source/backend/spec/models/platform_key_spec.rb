require "rails_helper"

RSpec.describe PlatformKey do
  let(:fixtures_root) { Rails.root.join("spec/fixtures/platform_keys") }

  describe ".all" do
    it "retorna lista vazia quando o diretório não existe" do
      result = described_class.all(root: Rails.root.join("spec/fixtures/__nonexistent__"))
      expect(result).to eq([])
    end

    it "retorna lista vazia quando o diretório existe mas está vazio" do
      Dir.mktmpdir do |tmp|
        result = described_class.all(root: tmp)
        expect(result).to eq([])
      end
    end

    it "carrega todas as chaves do diretório em ordem alfabética por arquivo" do
      result = described_class.all(root: fixtures_root)
      key_ids = result.map { |k| k["key_id"] }
      expect(key_ids).to eq([
        "beheld-platform-2026-q1",
        "beheld-platform-2026-q2",
        "beheld-platform-2026-q3",
      ])
    end

    it "prefixa a public_key com 'ed25519-pub:'" do
      result = described_class.all(root: fixtures_root)
      active = result.find { |k| k["key_id"] == "beheld-platform-2026-q2" }
      expect(active["public_key"]).to start_with("ed25519-pub:")
      expect(active["public_key"]).to eq("ed25519-pub:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
    end

    it "preserva flags active/revoked da chave ativa" do
      result = described_class.all(root: fixtures_root)
      active = result.find { |k| k["key_id"] == "beheld-platform-2026-q2" }
      expect(active["active"]).to be(true)
      expect(active["revoked"]).to be(false)
      expect(active["rotated_at"]).to be_nil
      expect(active["revoked_at"]).to be_nil
      expect(active["revoked_reason"]).to be_nil
    end

    it "preserva rotated_at da chave aposentada (rotacionada)" do
      result = described_class.all(root: fixtures_root)
      rotated = result.find { |k| k["key_id"] == "beheld-platform-2026-q1" }
      expect(rotated["active"]).to be(false)
      expect(rotated["revoked"]).to be(false)
      expect(rotated["rotated_at"]).to eq("2026-04-10T09:00:00Z")
    end

    it "preserva revoked_at + revoked_reason da chave comprometida" do
      result = described_class.all(root: fixtures_root)
      revoked = result.find { |k| k["key_id"] == "beheld-platform-2026-q3" }
      expect(revoked["active"]).to be(false)
      expect(revoked["revoked"]).to be(true)
      expect(revoked["revoked_at"]).to eq("2026-04-21T03:00:00Z")
      expect(revoked["revoked_reason"]).to eq("private key suspected exposed in CI log")
    end

    it "expõe algorithm e created_at em cada chave" do
      result = described_class.all(root: fixtures_root)
      result.each do |key|
        expect(key["algorithm"]).to eq("ed25519")
        expect(key["created_at"]).to match(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\z/)
      end
    end

    it "estoura erro descritivo quando .info.json existe sem .pub correspondente" do
      Dir.mktmpdir do |tmp|
        File.write(File.join(tmp, "orphan-key.info.json"), {
          "key_id" => "orphan-key",
          "algorithm" => "ed25519",
          "created_at" => "2026-01-01T00:00:00Z",
          "active" => true,
          "revoked" => false,
        }.to_json)

        expect { described_class.all(root: tmp) }.to raise_error(/missing pub file/)
      end
    end
  end

  describe ".default_root" do
    it "aponta para keys/platform na raiz do app" do
      expect(described_class.default_root).to eq(Rails.root.join("keys", "platform"))
    end
  end
end
