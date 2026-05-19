require "rails_helper"
require "mock_redis"

RSpec.describe OauthStateStore do
  let(:redis) { MockRedis.new }
  let(:store) { described_class.new(redis: redis) }

  describe "pending state lifecycle" do
    it "persiste e devolve dados via take_pending" do
      store.put_pending("abc", { "cli_state" => "x", "cli_port" => 53432, "dev_pubkey" => "k" })
      result = store.take_pending("abc")
      expect(result).to eq({ "cli_state" => "x", "cli_port" => 53432, "dev_pubkey" => "k" })
    end

    it "take_pending é single-use: segunda chamada retorna nil" do
      store.put_pending("abc", { "x" => 1 })
      store.take_pending("abc")
      expect(store.take_pending("abc")).to be_nil
    end

    it "take_pending retorna nil quando state nunca foi armazenada" do
      expect(store.take_pending("unknown")).to be_nil
    end

    it "respeita TTL — chave expira após o tempo configurado" do
      store.put_pending("abc", { "x" => 1 }, ttl_seconds: 1)
      sleep 1.2
      expect(store.take_pending("abc")).to be_nil
    end
  end

  describe "claim lifecycle" do
    it "persiste e devolve a attestation via take_claim" do
      attestation = { "payload" => { "type" => "x" }, "signature" => "ed25519:AAAA" }
      store.put_claim("code123", attestation)
      expect(store.take_claim("code123")).to eq(attestation)
    end

    it "take_claim é single-use" do
      store.put_claim("code123", { "x" => 1 })
      store.take_claim("code123")
      expect(store.take_claim("code123")).to be_nil
    end

    it "take_claim retorna nil para code desconhecido" do
      expect(store.take_claim("unknown")).to be_nil
    end
  end

  describe "namespacing" do
    it "pending e claim usam prefixos distintos — códigos colidentes não conflitam" do
      store.put_pending("same", { "kind" => "pending" })
      store.put_claim("same",   { "kind" => "claim" })
      expect(store.take_pending("same")["kind"]).to eq("pending")
      expect(store.take_claim("same")["kind"]).to eq("claim")
    end
  end
end
