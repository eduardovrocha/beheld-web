require "rails_helper"

RSpec.describe "Api::V1::Dev::BundleHealth", type: :request do
  let(:account) { Account.create!(fingerprint: "fp_#{SecureRandom.hex(4)}", directory: true) }
  let(:session) { DevSession.create!(account: account, token: SecureRandom.hex(16), expires_at: 1.day.from_now) }
  let(:auth)    { { "Authorization" => "Bearer #{session.token}" } }

  def add_bundle(days_ago:)
    Bundle.create!(
      account:        account,
      url_slug:       "s_#{SecureRandom.hex(3)}",
      bundle_data:    { "payload" => { "l1" => { "avg_test_ratio" => 0.3 } } },
      visible:        true,
      last_bundle_at: days_ago.days.ago,
      published_at:   days_ago.days.ago,
    )
  end

  it "401 sem auth" do
    get "/api/v1/dev/bundle_health"
    expect(response).to have_http_status(:unauthorized)
  end

  it "no_bundle quando o dev não publicou nada" do
    get "/api/v1/dev/bundle_health", headers: auth
    expect(JSON.parse(response.body)).to eq({ "status" => "no_bundle" })
  end

  it "bundle com 4 dias → needs_nudge: false" do
    add_bundle(days_ago: 4)
    get "/api/v1/dev/bundle_health", headers: auth
    body = JSON.parse(response.body)
    expect(body["needs_nudge"]).to be false
    expect(body["days_since"]).to eq(4)
  end

  it "bundle com 5 dias → needs_nudge: true" do
    add_bundle(days_ago: 5)
    get "/api/v1/dev/bundle_health", headers: auth
    expect(JSON.parse(response.body)["needs_nudge"]).to be true
  end

  it "1 bundle → curve_status: building" do
    add_bundle(days_ago: 1)
    get "/api/v1/dev/bundle_health", headers: auth
    body = JSON.parse(response.body)
    expect(body["curve_status"]).to eq("building")
    expect(body["points"]).to eq(1)
  end

  it "2+ bundles → curve_status: available" do
    add_bundle(days_ago: 30)
    add_bundle(days_ago: 1)
    get "/api/v1/dev/bundle_health", headers: auth
    body = JSON.parse(response.body)
    expect(body["curve_status"]).to eq("available")
    expect(body["points"]).to eq(2)
  end
end
