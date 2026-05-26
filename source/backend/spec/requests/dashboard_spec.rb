require "rails_helper"

RSpec.describe "Dashboard", type: :request do
  # CSRF protection is on in production, but Rails request specs run with
  # `allow_forgery_protection = false` in test.rb so we don't need to mint
  # tokens by hand. The protect_from_forgery filter is still installed —
  # just no-ops in test.

  let(:dev_account) { create(:account, :with_contact) }
  let(:dev_session) { build_dev_session(dev_account) }
  let(:auth_header) { { "Authorization" => "Bearer #{dev_session.token}" } }

  def build_dev_session(acct, token: SecureRandom.hex(32), expires_at: 1.hour.from_now)
    DevSession.create!(account: acct, token: token, expires_at: expires_at)
  end

  describe "GET /dashboard" do
    it "returns 401 when no session token is supplied" do
      get "/dashboard"
      expect(response).to have_http_status(:unauthorized)
    end

    it "renders the dashboard for an authenticated dev" do
      bundle  = create(:bundle, account: dev_account)
      company = create(:company)
      create(:message, account: dev_account, company: company, body: "Olá, temos uma vaga.")
      create(:message, account: dev_account, company: company, body: "Outra empresa.", responded_at: 1.day.ago)
      Verification.create!(
        bundle:    bundle,
        company:   company,
        job_title: "Senior",
        area:      "Backend",
        verified_at: 1.hour.ago,
      )

      get "/dashboard", headers: auth_header

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Bundles publicados")
      expect(response.body).to include("beheld.dev/v/#{bundle.url_slug}")
      expect(response.body).to include("Olá, temos uma vaga.")
      expect(response.body).to include(company.name)
      # Status badge for fresh bundle
      expect(response.body).to include("verificado")
    end

    it "promotes ?session=<token> in the query string into a cookie + redirect" do
      get "/dashboard?session=#{dev_session.token}"
      expect(response).to have_http_status(:redirect)
      expect(response.location).not_to include("session=")
    end
  end

  describe "PATCH /dashboard/settings" do
    it "updates the account fields and redirects" do
      patch "/dashboard/settings",
            params: {
              email_recovery:       "recover@example.com",
              email_contact:        "contact@example.com",
              phone_contact:        "+5511999990000",
              directory:            "true",
              watch:                "true",
              notification_email:   "notify@example.com",
              notification_webhook: "https://example.com/hook",
            },
            headers: auth_header

      expect(response).to redirect_to("/dashboard")

      dev_account.reload
      expect(dev_account.email_recovery).to       eq("recover@example.com")
      expect(dev_account.email_contact).to        eq("contact@example.com")
      expect(dev_account.phone_contact).to        eq("+5511999990000")
      expect(dev_account.directory).to            be(true)
      expect(dev_account.watch).to                be(true)
      expect(dev_account.notification_email).to   eq("notify@example.com")
      expect(dev_account.notification_webhook).to eq("https://example.com/hook")
    end
  end

  describe "DELETE /dashboard/bundles/:id" do
    it "revokes a bundle owned by the current account" do
      bundle = create(:bundle, account: dev_account)

      expect {
        delete "/dashboard/bundles/#{bundle.id}", headers: auth_header
      }.to change { bundle.reload.revoked_at }.from(nil).to(be_present)

      expect(bundle.status).to eq(:revoked)
      expect(response).to redirect_to("/dashboard")
    end

    it "404s a bundle owned by another account (scoped through current_account)" do
      other_account = create(:account)
      other_bundle  = create(:bundle, account: other_account)

      delete "/dashboard/bundles/#{other_bundle.id}", headers: auth_header

      # current_dev_account.bundles.find raises RecordNotFound → rescued into a
      # flash + redirect (treats cross-account access as "not found").
      expect(response).to redirect_to("/dashboard")
      expect(other_bundle.reload.revoked_at).to be_nil
    end
  end

  describe "PATCH /dashboard/bundles/:id/toggle" do
    it "flips Account.directory when the toggle field is sent on /settings" do
      dev_account.update!(directory: false)
      patch "/dashboard/settings",
            params: { directory: "true" },
            headers: auth_header
      expect(dev_account.reload.directory).to be(true)
    end

    it "flips Bundle.visible" do
      bundle = create(:bundle, account: dev_account, visible: true)
      expect {
        patch "/dashboard/bundles/#{bundle.id}/toggle", headers: auth_header
      }.to change { bundle.reload.visible }.from(true).to(false)
    end
  end

  describe "POST /dashboard/messages/:id/respond" do
    let(:company) { create(:company) }
    let(:message) { create(:message, account: dev_account, company: company) }

    it "returns 422 when contact details are not configured" do
      dev_account.update!(email_contact: nil, phone_contact: nil)

      post "/dashboard/messages/#{message.id}/respond", headers: auth_header

      expect(response).to have_http_status(:unprocessable_entity)
      expect(message.reload.responded_at).to be_nil
    end

    it "marks the message responded when contact is configured" do
      expect(dev_account.contact_configured?).to be(true)

      post "/dashboard/messages/#{message.id}/respond", headers: auth_header

      expect(response).to redirect_to("/dashboard")
      expect(message.reload.responded_at).to be_present
    end

    it "enqueues RespondContactJob with the message id when responded" do
      expect {
        post "/dashboard/messages/#{message.id}/respond", headers: auth_header
      }.to have_enqueued_job(RespondContactJob).with(message.id)
    end
  end

  describe "POST /dashboard/messages/:id/ignore" do
    it "marks the message ignored" do
      message = create(:message, account: dev_account, company: create(:company))

      post "/dashboard/messages/#{message.id}/ignore", headers: auth_header

      expect(response).to redirect_to("/dashboard")
      expect(message.reload.ignored_at).to be_present
    end
  end
end
