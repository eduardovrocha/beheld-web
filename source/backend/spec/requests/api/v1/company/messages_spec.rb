require "rails_helper"

RSpec.describe "Api::V1::Company::Messages", type: :request do
  def login_as(c)
    link = MagicLink.create!(company: c, token: SecureRandom.hex(32),
                             expires_at: 10.minutes.from_now, created_at: Time.current)
    post "/api/v1/sessions/company/verify", params: { token: link.token }, as: :json
  end

  let(:company) { create(:company) }
  let(:account) { create(:account) }

  it "returns 401 without auth" do
    get "/api/v1/company/messages"
    expect(response).to have_http_status(:unauthorized)
  end

  it "only returns messages from the logged-in company" do
    create(:message, company: company,         account: account, body: "MINE")
    create(:message, company: create(:company), account: account, body: "OTHER")

    login_as(company)
    get "/api/v1/company/messages"

    bodies = JSON.parse(response.body).map { |m| m["body_excerpt"] }
    expect(bodies).to include("MINE")
    expect(bodies).not_to include("OTHER")
  end

  it "truncates body_excerpt to 80 chars" do
    long_body = "x" * 200
    create(:message, company: company, account: account, body: long_body)

    login_as(company)
    get "/api/v1/company/messages"

    excerpt = JSON.parse(response.body).first["body_excerpt"]
    expect(excerpt.length).to be <= 80
    expect(excerpt).to end_with("...") # Rails' default omission token
  end

  it "never leaks contact fields" do
    account.update!(
      email_contact: "leak-CONTACT@example.com",
      phone_contact: "+5511955554321",
    )
    create(:message, company: company, account: account)

    login_as(company)
    get "/api/v1/company/messages"

    expect(response.body).not_to include("leak-CONTACT@example.com")
    expect(response.body).not_to include("+5511955554321")
  end
end
