require "rails_helper"

# PF.10 — cobertura do POST/PATCH de positions com o payload achatado real
# (sem wrapper `position:`): location jsonb, sections jsonb, technologies
# array, thresholds e priorities nas tabelas associadas.
RSpec.describe "Api::V1::Company::Positions create/update", type: :request do
  def login_as(company)
    link = MagicLink.create!(
      company: company, token: SecureRandom.hex(32),
      expires_at: 10.minutes.from_now, created_at: Time.current,
    )
    post "/api/v1/sessions/company/verify", params: { token: link.token }, as: :json
  end

  let(:company) { Company.create!(name: "Acme", email: "ops_#{SecureRandom.hex(2)}@test.dev") }

  before { login_as(company) }

  let(:valid_payload) do
    {
      title:        "Backend Engineer",
      location:     { region: "south_america", country: "BR", state: "MG", city: "Uberlândia" },
      sections:     { technical_stack: "Rails, PostgreSQL", requirements: "3+ anos" },
      technologies: ["Ruby", "Rails", "PostgreSQL"],
      thresholds: [
        { signal: "ecosystems", value: { items: ["rails", "react"] } },
        { signal: "test_ratio", value: { number: 35 } },
        { signal: "recency",    value: { number: 30 } },
      ],
      priorities: [
        { signal: "test_ratio" },
        { signal: "ecosystems" },
        { signal: "recency" },
      ],
    }
  end

  it "POST salva location jsonb estruturado" do
    post "/api/v1/company/positions", params: valid_payload, as: :json
    expect(response).to have_http_status(:created)
    pos = company.positions.last
    expect(pos.location).to eq(
      "region" => "south_america", "country" => "BR", "state" => "MG", "city" => "Uberlândia",
    )
  end

  it "POST salva sections jsonb e technologies array" do
    post "/api/v1/company/positions", params: valid_payload, as: :json
    pos = company.positions.last
    expect(pos.sections["technical_stack"]).to eq("Rails, PostgreSQL")
    expect(pos.technologies).to eq(["Ruby", "Rails", "PostgreSQL"])
  end

  it "POST cria thresholds e priorities nas tabelas associadas" do
    post "/api/v1/company/positions", params: valid_payload, as: :json
    pos = company.positions.last
    expect(pos.thresholds.pluck(:signal)).to match_array(%w[ecosystems test_ratio recency])
    eco = pos.thresholds.find_by(signal: "ecosystems")
    expect(eco.items).to eq(["rails", "react"])
    expect(eco.operator).to eq("includes")
    # priorities: ordem do array vira ranking 1..N, peso derivado
    ranked = pos.priorities.order(:ranking).pluck(:signal, :ranking, :weight)
    expect(ranked).to eq([["test_ratio", 1, 0.40], ["ecosystems", 2, 0.30], ["recency", 3, 0.20]])
  end

  it "POST sem title retorna erro (não cria a row)" do
    expect {
      post "/api/v1/company/positions", params: valid_payload.merge(title: ""), as: :json
    }.not_to change(Position, :count)
    expect(response).not_to have_http_status(:created)
  end

  it "PATCH atualiza location jsonb de uma row existente" do
    pos = company.positions.create!(title: "Old", status: "active", location: { "raw" => "São Paulo" })
    patch "/api/v1/company/positions/#{pos.id}",
          params: { location: { region: "remote" } }, as: :json
    expect(response).to have_http_status(:ok)
    expect(pos.reload.location).to eq({ "region" => "remote" })
  end

  describe "DELETE /positions/:id/purge (exclusão permanente)" do
    it "exclui de vez uma vaga arquivada e remove os filhos" do
      pos = company.positions.create!(title: "Velha", status: "active")
      pos.thresholds.create!(signal: "test_ratio", operator: "gte", value: { "number" => 30 })
      pos.priorities.create!(signal: "test_ratio", ranking: 1)
      pos.close! # arquiva (archived_at + status closed)

      expect {
        delete "/api/v1/company/positions/#{pos.id}/purge", as: :json
      }.to change(Position, :count).by(-1)

      expect(response).to have_http_status(:ok)
      expect(PositionThreshold.where(position_id: pos.id)).to be_empty
      expect(PositionPriority.where(position_id: pos.id)).to be_empty
    end

    it "recusa exclusão de vaga ainda ativa (422) e não apaga" do
      pos = company.positions.create!(title: "Ativa", status: "active")
      expect {
        delete "/api/v1/company/positions/#{pos.id}/purge", as: :json
      }.not_to change(Position, :count)
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "404 ao tentar excluir vaga de outra empresa" do
      other = Company.create!(name: "Other", email: "o_#{SecureRandom.hex(2)}@test.dev")
      pos = other.positions.create!(title: "Alheia", status: "active")
      pos.close!
      delete "/api/v1/company/positions/#{pos.id}/purge", as: :json
      expect(response).to have_http_status(:not_found)
      expect(Position.exists?(pos.id)).to be(true)
    end
  end
end
