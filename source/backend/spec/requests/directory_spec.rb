require "rails_helper"

RSpec.describe "Directory", type: :request do
  # Mint a signed company-session cookie via the production codepath. The
  # /sessions/company/verify hop sets the cookie in the integration session,
  # so subsequent requests carry it.
  def login_as(company)
    link = MagicLink.create!(
      company:    company,
      token:      SecureRandom.hex(32),
      expires_at: 10.minutes.from_now,
      created_at: Time.current,
    )
    get "/sessions/company/verify", params: { token: link.token }
  end

  # Build a Bundle whose JSONB payload carries the L1 ecosystems + test ratio
  # the controller actually queries.
  def make_dev(directory:, ecosystems: %w[rails], avg_test_ratio: 0.4,
               last_bundle_at: 1.day.ago, revoked: false,
               email_contact: "secret@dev.example", phone_contact: "+5511000000000")
    account = create(:account,
                     directory:      directory,
                     email_contact:  email_contact,
                     phone_contact:  phone_contact)
    create(
      :bundle,
      account:        account,
      last_bundle_at: last_bundle_at,
      revoked_at:     revoked ? Time.current : nil,
      bundle_data: {
        "version" => "5",
        "payload" => {
          "l1" => {
            "ecosystems"     => ecosystems.index_with { true },
            "platforms"      => { "docker" => true },
            "avg_test_ratio" => avg_test_ratio,
          },
        },
      },
    )
    account
  end

  let(:company) { create(:company) }

  describe "GET /directory" do
    it "redirects unauthenticated visitors to the company login form" do
      get "/directory"
      expect(response).to redirect_to(new_company_session_path)
    end

    it "renders the directory for a logged-in company" do
      login_as(company)
      get "/directory"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Resultados")
      expect(response.body).to include("Filtros")
    end

    it "excludes accounts with directory: false" do
      hidden_dev = make_dev(directory: false)

      login_as(company)
      get "/directory"

      # Handle for an opt-out account would surface their fingerprint;
      # neither prefix nor explicit text should appear.
      expect(response.body).not_to include("dev-#{hidden_dev.fingerprint.first(8)}")
    end

    it "excludes accounts whose only bundle is revoked" do
      revoked_dev = make_dev(directory: true, revoked: true)

      login_as(company)
      get "/directory"

      expect(response.body).not_to include("dev-#{revoked_dev.fingerprint.first(8)}")
    end

    it "filters status=verified to bundles published within the freshness window" do
      fresh = make_dev(directory: true, last_bundle_at: 1.day.ago,  ecosystems: %w[rails])
      stale = make_dev(directory: true, last_bundle_at: 90.days.ago, ecosystems: %w[python])

      login_as(company)
      get "/directory", params: { status: "verified" }

      expect(response.body).to     include("dev-#{fresh.fingerprint.first(8)}")
      expect(response.body).not_to include("dev-#{stale.fingerprint.first(8)}")
    end

    it "filters status=outdated to bundles past the freshness window" do
      fresh = make_dev(directory: true, last_bundle_at: 1.day.ago,  ecosystems: %w[rails])
      stale = make_dev(directory: true, last_bundle_at: 90.days.ago, ecosystems: %w[python])

      login_as(company)
      get "/directory", params: { status: "outdated" }

      expect(response.body).not_to include("dev-#{fresh.fingerprint.first(8)}")
      expect(response.body).to     include("dev-#{stale.fingerprint.first(8)}")
    end

    it "narrows by ecosystem when the filter is selected" do
      rails_dev   = make_dev(directory: true, ecosystems: %w[rails])
      python_dev  = make_dev(directory: true, ecosystems: %w[python])

      login_as(company)
      get "/directory", params: { ecosystems: %w[python] }

      expect(response.body).not_to include("dev-#{rails_dev.fingerprint.first(8)}")
      expect(response.body).to     include("dev-#{python_dev.fingerprint.first(8)}")
    end

    it "respects test_ratio_min" do
      low  = make_dev(directory: true, avg_test_ratio: 0.10, ecosystems: %w[a])
      high = make_dev(directory: true, avg_test_ratio: 0.80, ecosystems: %w[b])

      login_as(company)
      get "/directory", params: { test_ratio_min: 0.5 }

      expect(response.body).not_to include("dev-#{low.fingerprint.first(8)}")
      expect(response.body).to     include("dev-#{high.fingerprint.first(8)}")
    end

    it "never exposes dev contact fields (email_contact, phone_contact)" do
      make_dev(
        directory:     true,
        email_contact: "secret@dev.example",
        phone_contact: "+5511955554321",
      )

      login_as(company)
      get "/directory"

      expect(response.body).not_to include("secret@dev.example")
      expect(response.body).not_to include("+5511955554321")
    end
  end
end
