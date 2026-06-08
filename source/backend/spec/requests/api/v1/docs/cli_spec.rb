# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Docs::Cli", type: :request do
  def create_doc(version:, tag: nil, published_at: Time.utc(2026, 6, 8),
                 commit_sha: "d41f476", markdown: "# CLI\n\ntexto")
    CliDoc.create!(
      version: version,
      commit_sha: commit_sha,
      published_at: published_at,
      tag: tag,
      markdown: markdown,
      checksum: Digest::SHA256.hexdigest(markdown)
    )
  end

  describe "GET /api/v1/docs/cli/versions" do
    it "retorna lista vazia [] quando não há docs" do
      get "/api/v1/docs/cli/versions"
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "retorna lista ordenada por published_at desc, sem markdown" do
      create_doc(version: "0.3.0", published_at: Time.utc(2026, 1, 1), commit_sha: "aaa1111")
      create_doc(version: "0.4.1", published_at: Time.utc(2026, 6, 8), commit_sha: "d41f476", tag: "latest")
      create_doc(version: "0.4.0", published_at: Time.utc(2026, 5, 22), commit_sha: "d7badd8", tag: "stable")

      get "/api/v1/docs/cli/versions"
      expect(response).to have_http_status(:ok)
      body = response.parsed_body

      expect(body.map { |e| e["version"] }).to eq(["0.4.1", "0.4.0", "0.3.0"])
      expect(body[0]).to include("version" => "0.4.1", "tag" => "latest", "commit_sha" => "d41f476")
      expect(body[0]).not_to have_key("markdown")
      expect(body[0]).not_to have_key("checksum")
    end

    it "envia Cache-Control public" do
      get "/api/v1/docs/cli/versions"
      expect(response.headers["Cache-Control"]).to include("public")
      expect(response.headers["Cache-Control"]).to include("max-age")
    end
  end

  describe "GET /api/v1/docs/cli/:version" do
    it "retorna 200 com o markdown e content-type text/markdown" do
      create_doc(version: "0.4.1", markdown: "# CLI 0.4.1\n\ntexto")

      get "/api/v1/docs/cli/0.4.1"
      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("text/markdown")
      expect(response.body).to include("# CLI 0.4.1")
    end

    it "retorna 404 JSON quando versão não existe" do
      get "/api/v1/docs/cli/9.9.9"
      expect(response).to have_http_status(:not_found)
      body = response.parsed_body
      expect(body["error"]).to eq("version_not_found")
      expect(body["version"]).to eq("9.9.9")
    end

    it "expõe ETag determinístico por checksum" do
      create_doc(version: "0.4.1", markdown: "fixed content")
      get "/api/v1/docs/cli/0.4.1"
      etag_a = response.headers["ETag"]
      get "/api/v1/docs/cli/0.4.1"
      etag_b = response.headers["ETag"]
      expect(etag_a).to be_present
      expect(etag_a).to eq(etag_b)
    end

    it "ETag muda quando o checksum muda" do
      doc = create_doc(version: "0.4.1", markdown: "original")
      get "/api/v1/docs/cli/0.4.1"
      etag_original = response.headers["ETag"]

      new_markdown = "modified"
      doc.update!(markdown: new_markdown, checksum: Digest::SHA256.hexdigest(new_markdown))

      get "/api/v1/docs/cli/0.4.1"
      expect(response.headers["ETag"]).not_to eq(etag_original)
    end

    it "responde 304 quando If-None-Match bate com o ETag" do
      create_doc(version: "0.4.1", markdown: "fixed content")
      get "/api/v1/docs/cli/0.4.1"
      etag = response.headers["ETag"]

      get "/api/v1/docs/cli/0.4.1", headers: { "If-None-Match" => etag }
      expect(response).to have_http_status(:not_modified)
    end

    it "responde 200 quando If-None-Match não bate" do
      create_doc(version: "0.4.1", markdown: "fixed content")
      get "/api/v1/docs/cli/0.4.1", headers: { "If-None-Match" => 'W/"obsolete"' }
      expect(response).to have_http_status(:ok)
    end

    it "aceita versões com hífen no nome (pre-release)" do
      create_doc(version: "0.5.0-rc1", markdown: "# pre-release")
      get "/api/v1/docs/cli/0.5.0-rc1"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("pre-release")
    end
  end

  describe "GET /api/v1/docs/cli/latest" do
    it "redireciona 302 para o doc com tag=latest" do
      create_doc(version: "0.4.0", tag: "stable", published_at: Time.utc(2026, 5, 22))
      create_doc(version: "0.4.1", tag: "latest", published_at: Time.utc(2026, 6, 8))

      get "/api/v1/docs/cli/latest"
      expect(response).to have_http_status(:found)
      expect(response.location).to end_with("/api/v1/docs/cli/0.4.1")
    end

    it "redireciona para o mais recente quando nenhum tem tag latest" do
      create_doc(version: "0.3.0", tag: nil, published_at: Time.utc(2026, 1, 1))
      create_doc(version: "0.4.1", tag: nil, published_at: Time.utc(2026, 6, 8))

      get "/api/v1/docs/cli/latest"
      expect(response).to have_http_status(:found)
      expect(response.location).to end_with("/api/v1/docs/cli/0.4.1")
    end

    it "retorna 404 JSON quando não há nenhum doc publicado" do
      get "/api/v1/docs/cli/latest"
      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("no_docs_published")
    end
  end
end
