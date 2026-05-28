# Anonymous interest counter shown on the dev's dashboard.
#
# Spec section 7:
#   "N empresas têm necessidades que correspondem ao seu perfil esta semana.
#    Apenas contagem anônima. Sem nome de empresa, sem score, sem conteúdo
#    da vaga. ... A contagem é gerada a partir de postings ativos que
#    incluem o dev na lista ranqueada (não near-miss — apenas matches
#    confirmados)."
#
# Stop conditions enforced inline:
#   - Near-miss is EXCLUDED — only match_type = "match".
#   - Result is a single integer. No company/position metadata leaks here.
#
# Caller (Api::V1::DashboardController for devs) drops this into the
# dashboard payload alongside the dev's own bundles/messages, where the
# dev's UI already lives.

module Positions
  class DevInterest
    # Window from spec section 7: "Atualizado semanalmente / esta semana".
    # Filtra matches calculados nos últimos 7 dias — assim recrutadores que
    # rodam o matching uma vez por mês não atingem o contador, mas reativações
    # (que sempre recalculam) renovam o sinal em segundos.
    WINDOW = 1.week

    def self.count_for(account, now: Time.current)
      PositionMatch
        .where(account_id: account.id, match_type: "match")
        .where("position_matches.calculated_at >= ?", now - WINDOW)
        .joins(:position)
        .where(positions: { status: "active" })
        .distinct
        .count("positions.company_id")
    end
  end
end
