require "rails_helper"

RSpec.describe "Profile (/v/:slug)", type: :request do
  def make_bundle(payload_overrides: {}, last_bundle_at: 1.day.ago,
                  account: create(:account, email_contact: nil, phone_contact: nil),
                  revoked: false)
    bundle_data = {
      "version"    => "5",
      "payload"    => {
        "created_at"     => "2026-05-26T12:00:00Z",
        "beheld_version" => "0.3.2",
        "scores"         => { "overall" => 78, "prompt_quality" => 80, "test_maturity" => 60,
                              "tech_breadth" => 70, "growth_rate" => 75 },
        "l1"             => { "total_repos" => 3, "total_commits" => 120,
                              "ecosystems" => { "rails" => true } },
        "l2"             => { "sessions_analyzed" => 30, "period_days" => 30,
                              "platforms" => { "docker" => 5 } },
      }.deep_merge(payload_overrides),
      "hash"       => "sha256:" + ("a" * 64),
      "signature"  => "ed25519:" + ("b" * 128),
      "public_key" => "ed25519:dGVzdC1rZXktYnl0ZXM",
    }
    create(:bundle,
           account:        account,
           last_bundle_at: last_bundle_at,
           revoked_at:     revoked ? Time.current : nil,
           bundle_data:    bundle_data)
  end

  describe "GET /v/:slug" do
    it "renders 200 with the profile for a valid, fresh bundle" do
      bundle = make_bundle
      get "/v/#{bundle.url_slug}"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("profile id · #{bundle.url_slug}")
      expect(response.body).to include("forever free for developers")
      expect(response.body).to include("Web Crypto API")  # Ed25519 JS hook present
    end

    it "renders the `verificado` badge when last_bundle_at is within 30 days" do
      bundle = make_bundle(last_bundle_at: 1.day.ago)
      get "/v/#{bundle.url_slug}"
      expect(response.body).to include('class="badge verified"')
      expect(response.body).to include(">verificado<")
    end

    it "renders the `desatualizado` badge when last_bundle_at is past 30 days" do
      bundle = make_bundle(last_bundle_at: 60.days.ago)
      get "/v/#{bundle.url_slug}"
      expect(response.body).to include('class="badge outdated"')
      expect(response.body).to include(">desatualizado<")
    end

    it "returns 404 + revoked view for a revoked bundle" do
      bundle = make_bundle(revoked: true)
      get "/v/#{bundle.url_slug}"
      expect(response).to have_http_status(:not_found)
      expect(response.body).to include("Este perfil foi removido pelo desenvolvedor")
      # Revoked view must not leak the signed payload bytes.
      expect(response.body).not_to include("ed25519:")
    end

    it "returns 404 for an unknown slug" do
      get "/v/this-slug-does-not-exist"
      expect(response).to have_http_status(:not_found)
    end

    it "never exposes the dev's email_contact or phone_contact" do
      account = create(:account,
                       email_contact: "secret@dev.example",
                       phone_contact: "+5511955554321")
      bundle  = make_bundle(account: account)

      get "/v/#{bundle.url_slug}"

      expect(response.body).not_to include("secret@dev.example")
      expect(response.body).not_to include("+5511955554321")
    end

    it "exposes a working /v/:slug.dpbundle download for active bundles" do
      bundle = make_bundle
      get "/v/#{bundle.url_slug}.dpbundle"
      expect(response).to have_http_status(:ok)
      expect(response.headers["Content-Disposition"]).to include("attachment")
      expect(response.headers["Content-Disposition"]).to include("beheld-#{bundle.url_slug}.dpbundle")
      expect(JSON.parse(response.body)).to have_key("payload")
    end

    it "404s the download endpoint when the bundle is revoked" do
      bundle = make_bundle(revoked: true)
      get "/v/#{bundle.url_slug}.dpbundle"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "legacy fallback (Snapshot.short_id)" do
    it "still resolves URLs that point at a legacy Snapshot short_id" do
      payload = {
        "created_at" => "2026-05-14T00:00:00+00:00", "beheld_version" => "0.1.0",
        "scores"     => { "overall" => 70, "prompt_quality" => 70, "test_maturity" => 70,
                          "tech_breadth" => 70, "growth_rate" => 70, "date" => "2026-05-14" },
        "signals"    => { "platforms" => { "docker" => 1 } },
      }
      snap = Snapshot.create!(
        bundle_hash: "sha256:" + ("c" * 64),
        public_key:  "ed25519:somePublicKey",
        payload:     { "version" => "1", "payload" => payload,
                       "hash" => "sha256:" + ("c" * 64),
                       "signature" => "ed25519:" + ("d" * 64),
                       "public_key" => "ed25519:somePublicKey" },
      )

      get "/v/#{snap.short_id}"
      expect(response).to have_http_status(:ok)
      # Legacy view renders — exact body content is exercised by snapshot specs.
      expect(response.body).to be_present
    end
  end
end
