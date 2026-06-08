# Latest CLI version advertised to clients.
#
# GET /api/version
#   Retorna { version: "<semver>" } com a versão mais recente do binário
#   `beheld` publicada. Consumido por `beheld update` para decidir se baixa
#   uma versão nova.
#
#   200: sempre — payload mínimo, sem rate-limit (chamada cabe no /version
#        prefetch do `beheld update` que roda no boot do dev).
#
# Fonte da verdade:
#   - Constante `LATEST_CLI_VERSION` neste arquivo (review-gated).
#   - Override por ENV `BEHELD_LATEST_CLI_VERSION` em prod para hot-bump
#     entre deploys (ops controla, código não muda).
#
# Sincronização com a CLI:
#   - O binário publicado em GitHub Releases declara sua própria versão em
#     `packages/cli/src/version.ts` (constante `VERSION`).
#   - Toda release bumpa ambos os arquivos no mesmo commit.
#   - `beheld update` é who-asks; o servidor é who-tells. Nunca o contrário.
class VersionsController < ApplicationController
  # Tracking constant — atualizar junto com packages/cli/src/version.ts no
  # commit de release. Em prod, ENV.BEHELD_LATEST_CLI_VERSION sobrescreve.
  LATEST_CLI_VERSION = "0.4.1".freeze

  def show
    render json: { version: current_version }
  end

  private

  def current_version
    ENV.fetch("BEHELD_LATEST_CLI_VERSION", LATEST_CLI_VERSION)
  end
end
