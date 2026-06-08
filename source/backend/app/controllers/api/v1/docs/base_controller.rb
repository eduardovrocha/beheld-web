# frozen_string_literal: true

# Base para endpoints públicos sob /api/v1/docs/*. Sem autenticação — toda
# a árvore /api/v1/docs/* é pública e cacheable. Mantém um único ponto de
# truque para CORS / Cache-Control / 404 se precisar evoluir.

module Api
  module V1
    module Docs
      class BaseController < ApplicationController
        skip_before_action :verify_authenticity_token, raise: false
      end
    end
  end
end
