# Install counter endpoints.
#
# POST /api/install/register
#   Recebe { id: uuid-v4, os: macos|linux, version: semver } e cria registro
#   idempotente por id. Chamadas repetidas com o mesmo id são no-op (não
#   dobram o contador).
#   204: sucesso (incluindo idempotente)
#   400: payload inválido
#   429: rate limit (cliente trata como sucesso silencioso)
#
# GET /api/install/count
#   Retorna { count: N } com o total atual. Cacheado 60s server-side.
#   200: sempre
#
# Privacy invariants travadas:
#   - id, os, version: ÚNICOS campos no payload e na tabela
#   - Sem IP, sem user-agent, sem fingerprint
#   - Sem rastreamento de uninstall

class InstallsController < ApplicationController
  UUID_V4_REGEX = /\A[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/i.freeze
  COUNT_CACHE_KEY = "install_count".freeze
  COUNT_CACHE_TTL = 60.seconds

  def register
    return head :bad_request unless valid_payload?

    # find_or_create_by garante idempotência: POST repetido com mesmo id
    # não cria novo registro.
    Install.find_or_create_by!(id: params[:id]) do |i|
      i.os      = params[:os]
      i.version = params[:version]
    end
    head :no_content
  end

  def count
    n = Rails.cache.fetch(COUNT_CACHE_KEY, expires_in: COUNT_CACHE_TTL) do
      Install.count
    end
    render json: { count: n }
  end

  private

  def valid_payload?
    params[:id].to_s.match?(UUID_V4_REGEX) &&
      Install::VALID_OS.include?(params[:os].to_s) &&
      params[:version].to_s.match?(Install::VALID_VERSION_REGEX)
  end
end
