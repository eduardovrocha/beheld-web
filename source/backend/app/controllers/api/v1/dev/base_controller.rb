# Shared base for the dev-facing JSON endpoints under /api/v1/dev/*.
#
# Dev sessions ride as a Bearer token (issued by `beheld auth` →
# DevSession.token). DevAuthenticated already handles header parsing +
# 401 emission for HTML; here we override with JSON 401 so the SPA can
# branch on the structured error.

module Api
  module V1
    module Dev
      class BaseController < ApplicationController
        include DevAuthenticated

        rescue_from ActiveRecord::RecordNotFound do
          render json: { ok: false, error: "not_found" }, status: :not_found
        end

        # DevAuthenticated já entrega JSON 401 com `{ error, reason }`.
        # Nada a sobrescrever — este base só agrupa os endpoints sob /dev/.
      end
    end
  end
end
