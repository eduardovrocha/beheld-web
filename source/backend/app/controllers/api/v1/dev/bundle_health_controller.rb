# P22.2 — dashboard do dev consulta este endpoint pra renderizar o card
# "Curva de evolução · N pontos · última atualização há M dias".
#
# Shape do retorno (alinhado à spec):
#   no bundle ativo:   { status: "no_bundle" }
#   com bundle ativo:  { days_since, points, needs_nudge, curve_status }
#
# `needs_nudge` é true quando o bundle tem ≥ 5 dias (P22 cadence). O dev
# nunca é penalizado: o nudge é sinal de atividade, não de problema.

module Api
  module V1
    module Dev
      class BundleHealthController < BaseController
        NUDGE_THRESHOLD_DAYS = 5

        # GET /api/v1/dev/bundle_health
        def show
          bundles = @current_account.bundles.active.where(visible: true).order(last_bundle_at: :desc)
          latest  = bundles.first

          if latest.nil?
            render json: { status: "no_bundle" } and return
          end

          days_since = ((Time.current - latest.last_bundle_at) / 86_400.0).floor
          points     = bundles.count

          render json: {
            status:        "available",
            days_since:    days_since,
            points:        points,
            needs_nudge:   days_since >= NUDGE_THRESHOLD_DAYS,
            curve_status:  points >= 2 ? "available" : "building",
            last_bundle_at: latest.last_bundle_at.iso8601,
          }
        end
      end
    end
  end
end
