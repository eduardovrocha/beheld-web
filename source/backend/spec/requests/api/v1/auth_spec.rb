require "rails_helper"

RSpec.describe "Api::V1::Auth", type: :request do
  # Real Ed25519 keypair shared across the spec — generated once, used to
  # sign nonces inside individual examples.
  let(:signing_key) { Ed25519::SigningKey.generate }
  let(:verify_key)  { signing_key.verify_key }
  let(:fingerprint) { verify_key.to_bytes.unpack1("H*") }
  let!(:account)    { create(:account, fingerprint: fingerprint) }

  def hex(bytes) = bytes.unpack1("H*")

  def issue_challenge_for(fp = fingerprint)
    post "/api/v1/auth/challenge", params: { fingerprint: fp }, as: :json
    JSON.parse(response.body)
  end

  describe "POST /api/v1/auth/challenge" do
    it "returns a nonce when the fingerprint maps to an Account" do
      expect {
        post "/api/v1/auth/challenge", params: { fingerprint: fingerprint }, as: :json
      }.to change(AuthChallenge, :count).by(1)

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["nonce"]).to match(/\A[0-9a-f]{64}\z/)
      expect(body["expires_in"]).to eq(AuthChallenge::TTL.to_i)
    end

    it "returns 404 when the fingerprint is unknown" do
      post "/api/v1/auth/challenge",
           params: { fingerprint: SecureRandom.hex(32) },
           as: :json

      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)["error"]).to eq("account_not_found")
    end
  end

  describe "POST /api/v1/auth/verify" do
    it "returns a session_token when the signature is valid" do
      body  = issue_challenge_for
      nonce = body["nonce"]
      sig   = hex(signing_key.sign([nonce].pack("H*")))

      expect {
        post "/api/v1/auth/verify",
             params: { fingerprint: fingerprint, nonce: nonce, signature: sig },
             as: :json
      }.to change(DevSession, :count).by(1)

      expect(response).to have_http_status(:ok)
      payload = JSON.parse(response.body)
      expect(payload["session_token"]).to match(/\A[0-9a-f]{64}\z/)
      expect(payload["redirect_url"]).to eq("/dashboard?session=#{payload['session_token']}")

      challenge = AuthChallenge.find_by!(nonce: nonce)
      expect(challenge.used_at).to be_present
    end

    it "returns 401 invalid_signature when the signature does not verify" do
      body  = issue_challenge_for
      nonce = body["nonce"]
      bogus = hex(Ed25519::SigningKey.generate.sign([nonce].pack("H*")))

      expect {
        post "/api/v1/auth/verify",
             params: { fingerprint: fingerprint, nonce: nonce, signature: bogus },
             as: :json
      }.not_to change(DevSession, :count)

      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)["error"]).to eq("invalid_signature")
    end

    it "returns 401 challenge_expired when the challenge TTL has lapsed" do
      body = issue_challenge_for
      AuthChallenge.find_by!(nonce: body["nonce"]).update!(expires_at: 1.minute.ago)
      sig = hex(signing_key.sign([body["nonce"]].pack("H*")))

      post "/api/v1/auth/verify",
           params: { fingerprint: fingerprint, nonce: body["nonce"], signature: sig },
           as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)["error"]).to eq("challenge_expired")
    end

    it "returns 401 challenge_used on a second redemption" do
      body  = issue_challenge_for
      nonce = body["nonce"]
      sig   = hex(signing_key.sign([nonce].pack("H*")))

      post "/api/v1/auth/verify",
           params: { fingerprint: fingerprint, nonce: nonce, signature: sig },
           as: :json
      expect(response).to have_http_status(:ok)

      post "/api/v1/auth/verify",
           params: { fingerprint: fingerprint, nonce: nonce, signature: sig },
           as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)["error"]).to eq("challenge_used")
    end
  end

  describe "DELETE /api/v1/auth/session" do
    let(:session) do
      DevSession.create!(account: account, token: SecureRandom.hex(32), expires_at: 1.hour.from_now)
    end

    it "revokes the session and returns ok when the bearer token is valid" do
      delete "/api/v1/auth/session",
             headers: { "Authorization" => "Bearer #{session.token}" }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq({ "ok" => true })
      expect(session.reload.expired?).to be(true)
    end

    it "returns 401 when no token is supplied" do
      delete "/api/v1/auth/session"

      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)["error"]).to eq("unauthenticated")
    end
  end
end
