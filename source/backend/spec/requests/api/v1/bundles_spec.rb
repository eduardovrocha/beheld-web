require "rails_helper"
require "canonical_json"

RSpec.describe "Api::V1::Bundles", type: :request do
  let(:signing_key) { Ed25519::SigningKey.generate }
  let(:verify_key)  { signing_key.verify_key }
  let(:fingerprint) { verify_key.to_bytes.unpack1("H*") }

  # Mirror the CLI envelope (`packages/cli/src/bundle/types.ts`): a `payload`
  # hash signed via Ed25519 over CanonicalJson.dump(payload). The real CLI
  # bundle has many more fields — anything beyond `payload` + `signature` is
  # ignored by the verifier on this end.
  def build_bundle(payload: default_payload)
    canonical = CanonicalJson.dump(payload)
    sig_hex   = signing_key.sign(canonical.b).unpack1("H*")
    {
      "version"   => "5",
      "payload"   => payload,
      "signature" => "ed25519:#{sig_hex}",
    }
  end

  def default_payload
    {
      "created_at"     => "2026-05-26T00:00:00Z",
      "beheld_version" => "0.3.2",
      "scores" => {
        "overall"        => 78,
        "prompt_quality" => 84,
        "test_maturity"  => 62,
        "tech_breadth"   => 91,
        "growth_rate"    => 75,
      },
    }
  end

  def encode(bundle) = Base64.strict_encode64(bundle.to_json)

  def post_bundle(params)
    post "/api/v1/bundles", params: params, as: :json
  end

  describe "POST /api/v1/bundles" do
    it "creates an Account on first publish and returns the URL" do
      expect {
        post_bundle(fingerprint: fingerprint, bundle: encode(build_bundle))
      }.to change(Account, :count).by(1).and change(Bundle, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["account_created"]).to be(true)
      expect(body["url"]).to match(%r{\Ahttps?://[^/]+/v/[a-z0-9]{9}\z})
      expect(body["bundle_id"]).to be_present
    end

    it "reuses an existing Account when the fingerprint already exists" do
      create(:account, fingerprint: fingerprint)

      expect {
        post_bundle(fingerprint: fingerprint, bundle: encode(build_bundle))
      }.to change(Account, :count).by(0).and change(Bundle, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)["account_created"]).to be(false)
    end

    it "returns 422 invalid_signature when the bundle was signed by a different key" do
      other_key = Ed25519::SigningKey.generate
      payload   = default_payload
      forged    = {
        "version"   => "5",
        "payload"   => payload,
        "signature" => "ed25519:#{other_key.sign(CanonicalJson.dump(payload).b).unpack1('H*')}",
      }

      expect {
        post_bundle(fingerprint: fingerprint, bundle: encode(forged))
      }.not_to change(Bundle, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["error"]).to eq("invalid_signature")
    end

    it "returns 422 invalid_bundle_format when the wrapper is malformed" do
      garbage = Base64.strict_encode64("not-json-at-all")

      expect {
        post_bundle(fingerprint: fingerprint, bundle: garbage)
      }.not_to change(Bundle, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["error"]).to eq("invalid_bundle_format")
    end

    it "persists email_recovery on first publish" do
      post_bundle(
        fingerprint:     fingerprint,
        bundle:          encode(build_bundle),
        email_recovery: "dev@example.com",
      )

      expect(response).to have_http_status(:created)
      expect(Account.find_by(fingerprint: fingerprint).email_recovery).to eq("dev@example.com")
    end

    it "updates last_bundle_at in place on a second publish (no duplicate Bundle)" do
      post_bundle(fingerprint: fingerprint, bundle: encode(build_bundle))
      first  = Bundle.find_by!(account: Account.find_by!(fingerprint: fingerprint))
      first_slug      = first.url_slug
      first_published = first.published_at
      travel_to(2.hours.from_now) do
        expect {
          post_bundle(fingerprint: fingerprint, bundle: encode(build_bundle))
        }.to change(Bundle, :count).by(0)
      end

      reloaded = first.reload
      expect(reloaded.url_slug).to eq(first_slug)
      expect(reloaded.published_at.to_i).to eq(first_published.to_i)
      expect(reloaded.last_bundle_at).to be > first_published
    end
  end
end
