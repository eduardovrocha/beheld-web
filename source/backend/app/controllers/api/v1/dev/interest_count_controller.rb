# P21 — endpoint dedicado para a contagem anônima de interesse.
#
# Spec section 7 (privacy invariants):
#   "Apenas contagem anônima. Sem nome de empresa, sem score, sem conteúdo
#    da vaga. ... A contagem é gerada a partir de postings ativos que
#    incluem o dev na lista ranqueada (não near-miss — apenas matches
#    confirmados)."
#
# A computação fica no `Positions::DevInterest` para casar com a versão
# embutida no payload do dashboard — single source of truth.

module Api
  module V1
    module Dev
      class InterestCountController < BaseController
        # GET /api/v1/dev/interest_count
        def show
          render json: { count: ::Positions::DevInterest.count_for(@current_account) }
        end
      end
    end
  end
end
