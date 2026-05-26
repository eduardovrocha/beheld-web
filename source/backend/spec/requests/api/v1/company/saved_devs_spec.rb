require "rails_helper"

RSpec.describe "Api::V1::Company::SavedDevs", type: :request do
  def login_as(c)
    link = MagicLink.create!(company: c, token: SecureRandom.hex(32),
                             expires_at: 10.minutes.from_now, created_at: Time.current)
    post "/api/v1/sessions/company/verify", params: { token: link.token }, as: :json
  end

  let(:company) { create(:company) }
  let(:account) { create(:account) }

  describe "GET /api/v1/company/saved_devs" do
    it "returns 401 without auth" do
      get "/api/v1/company/saved_devs"
      expect(response).to have_http_status(:unauthorized)
    end

    it "scopes by current company (never sees other companies' rows)" do
      mine  = create(:saved_dev, company: company, account: account, note: "MINE-NOTE")
      other = create(:saved_dev, company: create(:company), account: account, note: "OTHER-NOTE")

      login_as(company)
      get "/api/v1/company/saved_devs"

      ids = JSON.parse(response.body).map { |s| s["account_id"] }
      expect(ids).to eq([mine.account_id])
      expect(response.body).not_to include("OTHER-NOTE")
    end
  end

  describe "POST /api/v1/company/saved_devs" do
    it "creates a SavedDev" do
      login_as(company)
      expect {
        post "/api/v1/company/saved_devs", params: { account_id: account.id, note: "first pass" }, as: :json
      }.to change(SavedDev, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(SavedDev.last.note).to eq("first pass")
    end

    it "is idempotent on (company, account) pair — second POST updates the note, doesn't duplicate" do
      login_as(company)
      post "/api/v1/company/saved_devs", params: { account_id: account.id, note: "v1" }, as: :json
      expect {
        post "/api/v1/company/saved_devs", params: { account_id: account.id, note: "v2" }, as: :json
      }.not_to change(SavedDev, :count)

      expect(SavedDev.where(company: company, account: account).first.note).to eq("v2")
    end
  end

  describe "PATCH /api/v1/company/saved_devs/:account_id" do
    it "updates the note" do
      saved = create(:saved_dev, company: company, account: account, note: "old")

      login_as(company)
      patch "/api/v1/company/saved_devs/#{account.id}", params: { note: "new" }, as: :json

      expect(response).to have_http_status(:ok)
      expect(saved.reload.note).to eq("new")
    end

    it "returns 404 when trying to edit another company's row" do
      other_company = create(:company)
      create(:saved_dev, company: other_company, account: account, note: "DO-NOT-TOUCH")

      login_as(company) # different company
      patch "/api/v1/company/saved_devs/#{account.id}", params: { note: "hijack" }, as: :json

      expect(response).to have_http_status(:not_found)
      expect(SavedDev.find_by(company: other_company, account: account).note).to eq("DO-NOT-TOUCH")
    end
  end

  describe "DELETE /api/v1/company/saved_devs/:account_id" do
    it "removes the row" do
      create(:saved_dev, company: company, account: account)

      login_as(company)
      expect {
        delete "/api/v1/company/saved_devs/#{account.id}"
      }.to change(SavedDev, :count).by(-1)

      expect(response).to have_http_status(:ok)
    end

    it "returns 404 trying to delete another company's row" do
      other_company = create(:company)
      create(:saved_dev, company: other_company, account: account)

      login_as(company)
      expect {
        delete "/api/v1/company/saved_devs/#{account.id}"
      }.not_to change(SavedDev, :count)

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "response privacy" do
    it "never includes the dev's email_contact / phone_contact" do
      account.update!(
        email_contact: "secret-LIST@example.com",
        phone_contact: "+5511955554321",
      )
      create(:saved_dev, company: company, account: account, note: "n")

      login_as(company)
      get "/api/v1/company/saved_devs"

      expect(response.body).not_to include("secret-LIST@example.com")
      expect(response.body).not_to include("+5511955554321")
    end
  end
end
