require "rails_helper"

# Cobertura mínima do GET /api/v1/company/positions/:id (P16 show endpoint).
# Reusa o login_as do dashboard_spec — minta um magic link e dispara o
# verify pra exercitar o caminho real que seta a signed cookie.

RSpec.describe "Api::V1::Company::Positions#show", type: :request do
  def login_as(company)
    link = MagicLink.create!(
      company: company, token: SecureRandom.hex(32),
      expires_at: 10.minutes.from_now, created_at: Time.current,
    )
    post "/api/v1/sessions/company/verify", params: { token: link.token }, as: :json
  end

  let(:company) { Company.create!(name: "Acme",  email: "ops_#{SecureRandom.hex(2)}@test.dev") }
  let(:another) { Company.create!(name: "Other", email: "x_#{SecureRandom.hex(2)}@test.dev") }
  let(:position) {
    company.positions.create!(title: "Backend", status: "active",
                              activated_at: 1.day.ago, expires_at: 29.days.from_now)
  }

  it "401 sem cookie" do
    get "/api/v1/company/positions/#{position.id}"
    expect(response).to have_http_status(:unauthorized)
  end

  it "retorna a vaga quando autenticado pela empresa dona" do
    login_as(company)
    get "/api/v1/company/positions/#{position.id}"
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["id"]).to    eq(position.id)
    expect(body["title"]).to eq("Backend")
  end

  it "404 quando a vaga é de outra empresa (sem distinguir 'não é seu' de 'não existe')" do
    login_as(another)
    get "/api/v1/company/positions/#{position.id}"
    expect(response).to have_http_status(:not_found)
  end

  it "lazy-expire dispara no read quando a janela passou" do
    position.update!(activated_at: 31.days.ago, expires_at: 1.day.ago)
    login_as(company)
    get "/api/v1/company/positions/#{position.id}"
    expect(JSON.parse(response.body)["status"]).to eq("expired")
    expect(position.reload.status).to              eq("expired")
  end
end
