require "rails_helper"

RSpec.describe "Install counter endpoints (B3H31D)", type: :request do
  let(:valid_uuid) { "550e8400-e29b-41d4-a716-446655440000" }
  let(:valid_payload) { { id: valid_uuid, os: "macos", version: "0.3.2" } }

  # Test env usa :null_store por padrão. Testes que validam cache do count
  # e rate limit do rack-attack precisam de um cache REAL. Substituímos por
  # MemoryStore nesses contextos via with_real_cache helper.
  def with_real_cache
    original = Rails.cache
    memory = ActiveSupport::Cache::MemoryStore.new
    Rails.cache = memory
    Rack::Attack.cache.store = memory
    yield
  ensure
    Rails.cache = original
    Rack::Attack.cache.store = original
  end

  before do
    # Limpa cache de contador e throttles entre testes — mesmo no null_store
    # esses delete são no-op seguros.
    Rails.cache.delete(InstallsController::COUNT_CACHE_KEY)
  end

  describe "POST /api/install/register" do
    it "204 com payload válido e cria registro" do
      expect {
        post "/api/install/register", params: valid_payload, as: :json
      }.to change(Install, :count).by(1)
      expect(response).to have_http_status(:no_content)
      install = Install.find(valid_uuid)
      expect(install.os).to eq("macos")
      expect(install.version).to eq("0.3.2")
    end

    it "204 ambas vezes com o mesmo UUID, mas só 1 registro (idempotência)" do
      post "/api/install/register", params: valid_payload, as: :json
      expect(response).to have_http_status(:no_content)

      expect {
        post "/api/install/register", params: valid_payload, as: :json
      }.not_to change(Install, :count)
      expect(response).to have_http_status(:no_content)

      expect(Install.where(id: valid_uuid).count).to eq(1)
    end

    it "400 com UUID inválido" do
      post "/api/install/register", params: valid_payload.merge(id: "not-a-uuid"), as: :json
      expect(response).to have_http_status(:bad_request)
      expect(Install.count).to eq(0)
    end

    it "400 com UUID não-v4 (ex: v1)" do
      # UUID v1: o '4' do terceiro grupo é '1'.
      post "/api/install/register",
           params: valid_payload.merge(id: "550e8400-e29b-11d4-a716-446655440000"),
           as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "400 com os inválido" do
      post "/api/install/register", params: valid_payload.merge(os: "windows"), as: :json
      expect(response).to have_http_status(:bad_request)
      expect(Install.count).to eq(0)
    end

    it "400 com version inválido (não-semver)" do
      post "/api/install/register", params: valid_payload.merge(version: "v0.3"), as: :json
      expect(response).to have_http_status(:bad_request)
      expect(Install.count).to eq(0)
    end

    it "aceita os 'linux'" do
      post "/api/install/register", params: valid_payload.merge(os: "linux"), as: :json
      expect(response).to have_http_status(:no_content)
    end

    it "aceita version com sufixo (ex: 1.2.3-rc1)" do
      post "/api/install/register", params: valid_payload.merge(version: "1.2.3-rc1"), as: :json
      expect(response).to have_http_status(:no_content)
    end
  end

  describe "GET /api/install/count" do
    it "retorna { count: 0 } sem registros" do
      get "/api/install/count"
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq({ "count" => 0 })
    end

    it "retorna { count: N } com N registros" do
      3.times do |i|
        Install.create!(
          id: SecureRandom.uuid,
          os: "macos",
          version: "0.3.#{i}",
        )
      end
      get "/api/install/count"
      expect(JSON.parse(response.body)).to eq({ "count" => 3 })
    end

    it "é cacheado por 60s — segunda chamada não bate no DB" do
      with_real_cache do
        Install.create!(id: SecureRandom.uuid, os: "macos", version: "0.3.0")

        get "/api/install/count"
        expect(JSON.parse(response.body)["count"]).to eq(1)

        # Adiciona mais um registro DIRETAMENTE no DB — sem invalidar cache.
        Install.create!(id: SecureRandom.uuid, os: "linux", version: "0.3.0")

        # Cache deve retornar o valor antigo (1), não 2.
        get "/api/install/count"
        expect(JSON.parse(response.body)["count"]).to eq(1)
      end
    end
  end

  describe "rate limit em POST /api/install/register" do
    it "dispara 429 após o limite por IP" do
      with_real_cache do
        # Limit default = 10/hora. 11ª chamada deve voltar 429.
        11.times do |i|
          post "/api/install/register",
               params: valid_payload.merge(id: SecureRandom.uuid),
               as: :json,
               headers: { "REMOTE_ADDR" => "203.0.113.42" }
          if i < 10
            expect(response).to have_http_status(:no_content), "chamada #{i + 1} deveria passar"
          else
            expect(response).to have_http_status(:too_many_requests), "chamada #{i + 1} deveria ser throttled"
          end
        end
      end
    end

    it "limite é POR IP — IP diferente passa normalmente" do
      with_real_cache do
        10.times do
          post "/api/install/register",
               params: valid_payload.merge(id: SecureRandom.uuid),
               as: :json,
               headers: { "REMOTE_ADDR" => "203.0.113.42" }
        end
        # 11ª de 203.0.113.42 → throttled
        post "/api/install/register",
             params: valid_payload.merge(id: SecureRandom.uuid),
             as: :json,
             headers: { "REMOTE_ADDR" => "203.0.113.42" }
        expect(response).to have_http_status(:too_many_requests)

        # Mas IP diferente passa.
        post "/api/install/register",
             params: valid_payload.merge(id: SecureRandom.uuid),
             as: :json,
             headers: { "REMOTE_ADDR" => "198.51.100.7" }
        expect(response).to have_http_status(:no_content)
      end
    end
  end

  describe "privacy invariants (cláusula pétrea)" do
    it "schema Install tem APENAS id, os, version e timestamps" do
      schema_cols = Install.columns.map(&:name).sort
      expect(schema_cols).to eq(%w[created_at id os updated_at version])
    end

    it "controller não loga IP, user-agent, ou qualquer outro campo do request" do
      # Hard guard: o action register só toca params[:id], params[:os],
      # params[:version]. Se alguém adicionar params[:something_else], este
      # teste continua passando mas deve haver um teste explícito.
      source = File.read(Rails.root.join("app/controllers/installs_controller.rb"))
      forbidden = %w[request.ip request.user_agent request.headers request.env]
      forbidden.each do |frag|
        expect(source).not_to include(frag), "InstallsController não pode tocar em #{frag}"
      end
    end
  end
end
