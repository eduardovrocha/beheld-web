# frozen_string_literal: true

# Endpoints públicos da referência do CLI:
#   GET /api/v1/docs/cli/versions   → lista enxuta (sem markdown)
#   GET /api/v1/docs/cli/:version   → markdown bruto, content-type text/markdown
#   GET /api/v1/docs/cli/latest     → redireciona para a versão marcada como
#                                     "latest" (fallback: mais recente por
#                                     published_at)
#
# Dados vivem em CliDoc, populados pela rake task `docs:cli:ingest`.

module Api
  module V1
    module Docs
      class CliController < BaseController
        def versions
          response.set_header("Cache-Control", "public, max-age=300")
          render json: CliDoc.ordered.map(&:to_index_entry)
        end

        def show
          doc = CliDoc.find_by(version: params[:version])
          if doc.nil?
            return render json: { error: "version_not_found", version: params[:version] },
                          status: :not_found
          end

          response.set_header("Cache-Control", "public, max-age=3600")
          if stale?(etag: doc.cache_etag, last_modified: doc.updated_at, public: true)
            render plain: doc.markdown, content_type: "text/markdown"
          end
        end

        def latest
          doc = CliDoc.where(tag: "latest").ordered.first || CliDoc.ordered.first
          if doc.nil?
            return render json: { error: "no_docs_published" }, status: :not_found
          end

          redirect_to api_v1_docs_cli_show_url(version: doc.version), status: :found
        end
      end
    end
  end
end
