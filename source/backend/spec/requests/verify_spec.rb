require "rails_helper"
require "canonical_json"

RSpec.describe "Verify (recruiter upload)", type: :request do
  # Build a real signed bundle so the server can resolve the fingerprint and
  # the browser-side JS would accept the signature. Backend never verifies —
  # it only renders.
  let(:signing_key) { Ed25519::SigningKey.generate }
  let(:verify_key)  { signing_key.verify_key }
  let(:fingerprint) { verify_key.to_bytes.unpack1("H*") }
  let(:public_key_b64url) do
    [verify_key.to_bytes].pack("m0").tr("+/", "-_").delete("=")
  end

  let(:payload) do
    {
      "created_at"     => "2026-05-26T00:00:00Z",
      "beheld_version" => "0.3.2",
      "scores"         => {
        "overall" => 81, "prompt_quality" => 80, "test_maturity" => 70,
        "tech_breadth" => 90, "growth_rate" => 75,
      },
    }
  end

  def bundle_json(custom_payload: payload)
    signature_hex = signing_key.sign(CanonicalJson.dump(custom_payload).b).unpack1("H*")
    {
      "version"    => "5",
      "payload"    => custom_payload,
      "hash"       => "sha256:" + ("a" * 64),
      "signature"  => "ed25519:#{signature_hex}",
      "public_key" => "ed25519:#{public_key_b64url}",
    }
  end

  def bundle_upload(json)
    Rack::Test::UploadedFile.new(
      StringIO.new(JSON.dump(json)),
      "application/json",
      original_filename: "smoke.dpbundle",
    )
  end

  # Simulate a logged-in recruiter by minting and presenting the same signed
  # cookie the magic-link verify action would set.
  def cookie_for(company)
    jar = ActionDispatch::Cookies::CookieJar.build(
      ActionDispatch::Request.new(Rails.application.env_config),
      {},
    )
    jar.signed[CompanyAuthenticated::COOKIE_NAME] = company.id
    jar[CompanyAuthenticated::COOKIE_NAME]
  end

  describe "GET /verify" do
    it "renders the upload form for an anonymous visitor" do
      get "/verify"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Verificar bundle beheld")
      expect(response.body).to include("verificando como visitante")
    end

    it "shows the job_title/area fields when a company is logged in" do
      company = create(:company)
      get "/verify", headers: { "Cookie" => "#{CompanyAuthenticated::COOKIE_NAME}=#{cookie_for(company)}" }
      expect(response.body).to include("Cargo da vaga")
      expect(response.body).to include("Área de interesse")
    end
  end

  describe "POST /verify" do
    context "as an anonymous visitor" do
      it "renders the result page without persisting a Verification" do
        # Account + bundle exist on the portal so we render data, even though
        # we don't write anything to verifications.
        account = create(:account, fingerprint: fingerprint)
        create(:bundle, account: account)

        expect {
          post "/verify", params: { bundle_file: bundle_upload(bundle_json) }
        }.not_to change(Verification, :count)

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Status da verificação")
        expect(response.body).to include("crypto-verdict")
        expect(response.body).to include("verificado")
      end

      it "still renders with `sem registro público` when the fingerprint isn't on the portal" do
        post "/verify", params: { bundle_file: bundle_upload(bundle_json) }
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("sem registro público")
      end
    end

    context "as a logged-in company" do
      let(:company) { create(:company) }
      let(:cookie)  { { "Cookie" => "#{CompanyAuthenticated::COOKIE_NAME}=#{cookie_for(company)}" } }

      it "persists a Verification linked to the bundle and the company" do
        account = create(:account, fingerprint: fingerprint)
        bundle  = create(:bundle, account: account)

        expect {
          post "/verify",
               params:  { bundle_file: bundle_upload(bundle_json), job_title: "Senior", area: "Backend" },
               headers: cookie
        }.to change(Verification, :count).by(1)

        v = Verification.last
        expect(v.bundle_id).to eq(bundle.id)
        expect(v.company_id).to eq(company.id)
        expect(v.job_title).to eq("Senior")
        expect(v.area).to eq("Backend")
        expect(v.verified_at).to be_present
      end

      it "does NOT persist a Verification when the bundle has no portal record" do
        # Logged-in recruiter, but the dev never published — nothing to attach.
        expect {
          post "/verify",
               params:  { bundle_file: bundle_upload(bundle_json) },
               headers: cookie
        }.not_to change(Verification, :count)

        expect(response.body).to include("sem registro público")
      end
    end

    context "malformed input" do
      it "returns 422 with a clear message when no file is attached" do
        post "/verify"
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include("Selecione um arquivo")
      end

      it "returns 422 when the uploaded file isn't valid JSON" do
        garbage = Rack::Test::UploadedFile.new(StringIO.new("not-json-at-all"),
                                               "application/json",
                                               original_filename: "junk.dpbundle")
        post "/verify", params: { bundle_file: garbage }
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include("não foi possível ler o bundle")
      end

      it "returns 422 when JSON is valid but the envelope misses signature/public_key" do
        partial = { "payload" => payload }
        upload  = Rack::Test::UploadedFile.new(StringIO.new(JSON.dump(partial)),
                                               "application/json",
                                               original_filename: "partial.dpbundle")
        post "/verify", params: { bundle_file: upload }
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end
end
