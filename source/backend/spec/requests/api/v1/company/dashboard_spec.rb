require "rails_helper"

RSpec.describe "Api::V1::Company::Dashboard", type: :request do
  # Mint a real signed cookie via the verify flow so the test exercises the
  # production code path that sets it (instead of stubbing the jar).
  def login_as(company)
    link = MagicLink.create!(
      company: company, token: SecureRandom.hex(32),
      expires_at: 10.minutes.from_now, created_at: Time.current,
    )
    post "/api/v1/sessions/company/verify", params: { token: link.token }, as: :json
  end

  let(:company) { create(:company) }

  describe "GET /api/v1/company/dashboard" do
    it "returns 401 when no session cookie is present" do
      get "/api/v1/company/dashboard"
      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)).to include("error" => "unauthenticated")
    end

    it "returns stats + recent_activity for the logged-in company" do
      login_as(company)
      get "/api/v1/company/dashboard"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to have_key("stats")
      expect(body).to have_key("recent_activity")
      expect(body["stats"]).to include("verifications_total", "messages_total", "saved_devs_total")
    end

    it "verifications_total reflects only this company's verifications" do
      account = create(:account)
      bundle  = create(:bundle, account: account)
      Verification.create!(bundle: bundle, company: company,         verified_at: 1.hour.ago)
      Verification.create!(bundle: bundle, company: create(:company), verified_at: 1.hour.ago)

      login_as(company)
      get "/api/v1/company/dashboard"

      expect(JSON.parse(response.body).dig("stats", "verifications_total")).to eq(1)
    end

    it "response_rate is nil when no messages have been sent" do
      login_as(company)
      get "/api/v1/company/dashboard"
      expect(JSON.parse(response.body).dig("stats", "response_rate")).to be_nil
    end

    it "response_rate rounds correctly when there are responses" do
      acc = create(:account)
      3.times { create(:message, company: company, account: acc, responded_at: 1.minute.ago) }
      2.times { create(:message, company: company, account: acc) }

      login_as(company)
      get "/api/v1/company/dashboard"

      # 3 / 5 = 60%
      expect(JSON.parse(response.body).dig("stats", "response_rate")).to eq(60)
      expect(JSON.parse(response.body).dig("stats", "messages_total")).to eq(5)
      expect(JSON.parse(response.body).dig("stats", "messages_responded")).to eq(3)
    end

    it "recent_activity intercalates verifications + messages and never leaks contact fields" do
      account = create(:account,
                       email_contact:  "dev-SECRET@example.com",
                       phone_contact:  "+5511955554321",
                       email_recovery: "RECOVERY@example.com")
      bundle = create(:bundle, account: account)

      Verification.create!(bundle: bundle, company: company, verified_at: 2.hours.ago, job_title: "Senior")
      create(:message, company: company, account: account, job_title: "Mid",
                       body: "Hello — interessado em vaga.", sent_at: 1.hour.ago)

      login_as(company)
      get "/api/v1/company/dashboard"

      body = response.body
      expect(body).not_to include("dev-SECRET@example.com")
      expect(body).not_to include("+5511955554321")
      expect(body).not_to include("RECOVERY@example.com")

      events = JSON.parse(body)["recent_activity"]
      expect(events.map { |e| e["type"] }).to include("verification", "message")
      # newest first
      sorted = events.sort_by { |e| e["at"] }.reverse
      expect(events).to eq(sorted)
    end

    it "saved_devs_total reflects this company only and never exposes notes" do
      acc = create(:account)
      create(:saved_dev, company: company, account: acc, note: "PRIVATE-NOTE-ABC")
      create(:saved_dev, company: create(:company), account: acc, note: "OTHER-COMPANY-NOTE")

      login_as(company)
      get "/api/v1/company/dashboard"

      stats = JSON.parse(response.body)["stats"]
      expect(stats["saved_devs_total"]).to eq(1)
      expect(response.body).not_to include("PRIVATE-NOTE-ABC")
      expect(response.body).not_to include("OTHER-COMPANY-NOTE")
    end
  end
end
