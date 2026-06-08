require "rails_helper"

RSpec.describe "CLI version endpoint", type: :request do
  describe "GET /api/version" do
    # Isolate each example from process-wide env state.
    around do |example|
      original = ENV["BEHELD_LATEST_CLI_VERSION"]
      ENV.delete("BEHELD_LATEST_CLI_VERSION")
      example.run
    ensure
      if original.nil?
        ENV.delete("BEHELD_LATEST_CLI_VERSION")
      else
        ENV["BEHELD_LATEST_CLI_VERSION"] = original
      end
    end

    it "200 com a versão default constante quando ENV não está setada" do
      get "/api/version"
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to eq("version" => VersionsController::LATEST_CLI_VERSION)
    end

    it "respeita override por ENV BEHELD_LATEST_CLI_VERSION" do
      ENV["BEHELD_LATEST_CLI_VERSION"] = "9.9.9"
      get "/api/version"
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq("version" => "9.9.9")
    end

    it "devolve content-type JSON" do
      get "/api/version"
      expect(response.content_type).to start_with("application/json")
    end

    it "sempre 200 — sem rate-limit, sem auth" do
      5.times { get "/api/version" }
      expect(response).to have_http_status(:ok)
    end

    it "ENV vazia ('') é tratada como override válido (fetch retorna a string vazia)" do
      # `ENV.fetch("KEY", default)` só usa o default quando a chave é
      # AUSENTE. Uma string vazia é considerada presente — registra esse
      # comportamento como contrato para que ops saiba unset != set-to-empty.
      ENV["BEHELD_LATEST_CLI_VERSION"] = ""
      get "/api/version"
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq("version" => "")
    end

    it "payload tem exatamente a chave 'version' — sem extras" do
      get "/api/version"
      expect(JSON.parse(response.body).keys).to eq(["version"])
    end

    it "LATEST_CLI_VERSION default segue o formato semver" do
      # A constante é o que vai pro ar quando ENV não está setada — ela
      # PRECISA ser semver válido para o CLI conseguir comparar com
      # ===. Defesa em profundidade contra um typo no bump.
      expect(VersionsController::LATEST_CLI_VERSION).to match(/\A\d+\.\d+\.\d+\z/)
    end

    it "named route api_version_path resolve para /api/version" do
      # Acoplamento de roteamento — caça regressão se alguém renomear o
      # alias e o CLI passar a bater num path errado.
      expect(api_version_path).to eq("/api/version")
    end
  end
end
