require "rails_helper"

RSpec.describe "Api::V1::Dev::InterestCount", type: :request do
  let(:account) { Account.create!(fingerprint: "fp_#{SecureRandom.hex(4)}", directory: true) }
  let(:session) { DevSession.create!(account: account, token: SecureRandom.hex(16), expires_at: 1.day.from_now) }
  let(:auth)    { { "Authorization" => "Bearer #{session.token}" } }

  def make_match(account, match_type: "match", status: "active", calc_offset: 1.hour.ago)
    company = Company.create!(name: "Co_#{SecureRandom.hex(2)}", email: "c_#{SecureRandom.hex(2)}@test.dev")
    position = company.positions.create!(title: "P", status: status)
    PositionMatch.create!(
      position:      position,
      account:       account,
      match_type:    match_type,
      score:         80.0,
      failed_signal: match_type == "near_miss" ? "test_ratio" : nil,
      calculated_at: calc_offset.is_a?(Time) ? calc_offset : Time.current - calc_offset,
    )
  end

  it "401 sem auth dev" do
    get "/api/v1/dev/interest_count"
    expect(response).to have_http_status(:unauthorized)
  end

  it "{ count: 0 } sem matches" do
    get "/api/v1/dev/interest_count", headers: auth
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to eq({ "count" => 0 })
  end

  it "conta matches confirmados em posições ativas dentro da janela" do
    2.times { make_match(account) }
    get "/api/v1/dev/interest_count", headers: auth
    expect(JSON.parse(response.body)).to eq({ "count" => 2 })
  end

  it "IGNORA near_miss" do
    make_match(account, match_type: "near_miss")
    get "/api/v1/dev/interest_count", headers: auth
    expect(JSON.parse(response.body)).to eq({ "count" => 0 })
  end

  it "IGNORA posições expired/closed" do
    make_match(account, status: "expired")
    make_match(account, status: "closed")
    get "/api/v1/dev/interest_count", headers: auth
    expect(JSON.parse(response.body)).to eq({ "count" => 0 })
  end

  it "IGNORA matches calculados há mais de 7 dias" do
    m = make_match(account)
    m.update_column(:calculated_at, 8.days.ago)
    get "/api/v1/dev/interest_count", headers: auth
    expect(JSON.parse(response.body)).to eq({ "count" => 0 })
  end

  it "NUNCA vaza dados da empresa/vaga (apenas o inteiro)" do
    make_match(account)
    get "/api/v1/dev/interest_count", headers: auth
    body = JSON.parse(response.body)
    expect(body.keys).to eq(["count"])
    %w[company company_name title score threshold position_id].each do |forbidden|
      expect(body).not_to have_key(forbidden)
    end
  end
end
