# Recruiter-managed job postings. CRUD scoped to the current company —
# cross-company access returns 404 (we don't distinguish "not yours" from
# "doesn't exist"; the recruiter just sees an unhelpful response).

module Api
  module V1
    module Company
      class PositionsController < BaseController
        def index
          positions = current_company.positions
            .includes(:thresholds, :priorities)
            .order(archived_at: :asc, created_at: :desc)
          # Lazy-expire on read so recruiters always see fresh statuses
          # without needing a Sidekiq cron. Cheap: one UPDATE per position
          # whose 30-day window actually passed since last view.
          positions.each(&:expire_if_due!)
          render json: positions.map { |p| serialize(p) }
        end

        # GET /api/v1/company/positions/:id
        # Single-position read used by clients that deep-link straight to a
        # vaga (mailer "Vaga expirada" CTA, shareable internal links). Same
        # serialization shape as `index`, plus a fresh expire check.
        def show
          position = current_company.positions
            .includes(:thresholds, :priorities)
            .find(params[:id])
          position.expire_if_due!
          render json: serialize(position)
        end

        def create
          position = nil
          ActiveRecord::Base.transaction do
            position = current_company.positions.create!(scalar_params)
            persist_thresholds!(position)
            persist_priorities!(position)
            position.activate! if position.matching_enabled? && position.activated_at.nil?
          end
          recalculate_matches!(position)
          render json: { ok: true, position: serialize(position) }, status: :created
        end

        def update
          position = current_company.positions.find(params[:id])
          criteria_changed = params.key?(:thresholds) || params.key?(:priorities)
          ActiveRecord::Base.transaction do
            position.update!(scalar_params)
            persist_thresholds!(position) if params.key?(:thresholds)
            persist_priorities!(position) if params.key?(:priorities)
            position.activate! if position.matching_enabled? && position.status != "active"
          end
          recalculate_matches!(position) if criteria_changed
          render json: { ok: true, position: serialize(position.reload) }
        end

        # GET /api/v1/company/positions/:id/matches
        # Returns the persisted matches + near-miss results for the position.
        # `score` is rounded to integer for the UI, but kept as decimal in the
        # DB for any future re-ranking that needs precision.
        def matches
          position = current_company.positions.find(params[:id])
          render json: matches_payload(position)
        end

        # POST /api/v1/company/positions/:id/matches/recalculate
        # Manual trigger for the recruiter when they want fresh numbers.
        def recalculate
          position = current_company.positions.find(params[:id])
          recalculate_matches!(position)
          render json: matches_payload(position).merge(ok: true)
        end

        # POST /api/v1/company/positions/:id/reactivate (P20.3)
        # Reseta o status para `active`, recoloca o relógio de 30 dias,
        # e força um recálculo dos matches contra o estado atual do
        # diretório. Histórico de matches anterior é descartado pelo
        # próprio matcher (truncate-and-insert) — Message rows que já
        # apontavam para esta position não são tocados.
        def reactivate
          position = current_company.positions.find(params[:id])
          position.activate!
          recalculate_matches!(position)
          render json: { ok: true, position: serialize(position.reload) }
        end

        # Soft archive — flips `archived_at` instead of deleting so existing
        # Message rows that referenced this vacancy stay coherent. Mirrors
        # status to "closed" so the new state machine reflects it.
        def destroy
          position = current_company.positions.find(params[:id])
          position.close!
          render json: { ok: true, position: serialize(position) }
        end

        # Permanent delete. Only allowed once the vaga is archived — the UI
        # surfaces "Excluir" exclusively in the Arquivada tab. Children
        # (matches/thresholds/priorities) cascade via dependent: :destroy;
        # Message rows keep their denormalized `job_title` (no FK to positions),
        # so deleting a vaga never orphans a sent message.
        def purge
          position = current_company.positions.find(params[:id])
          unless position.archived?
            return render json: { ok: false, error: I18n.t("controllers.positions.purge_not_archived") },
                          status: :unprocessable_entity
          end
          position.destroy!
          render json: { ok: true, id: position.id }
        end

        private

        def scalar_params
          base = params.permit(:title, :description, :archived_at)
          # location is now jsonb — a structured hash from the picker, or a
          # bare string from legacy clients (wrapped into { raw: ... }).
          loc = params[:location]
          if loc.is_a?(ActionController::Parameters) || loc.is_a?(Hash)
            raw = loc.respond_to?(:to_unsafe_h) ? loc.to_unsafe_h : loc
            base[:location] = raw.deep_stringify_keys.slice(*::Position::LOCATION_KEYS)
          elsif loc.is_a?(String)
            base[:location] = loc.present? ? { "raw" => loc } : {}
          end
          if params[:technologies].is_a?(Array)
            base[:technologies] = params[:technologies].map(&:to_s)
          end
          if params[:sections].is_a?(ActionController::Parameters) ||
             params[:sections].is_a?(Hash)
            raw = params[:sections].to_unsafe_h rescue params[:sections]
            base[:sections] = ::Position::SECTION_KEYS.each_with_object({}) do |k, h|
              v = raw[k] || raw[k.to_sym]
              h[k] = v.to_s if v.present?
            end
          end
          base
        end

        # Replace the threshold set wholesale. The form posts the desired
        # final list each time — no patch semantics. Empty / missing array
        # means "no thresholds" (matching is disabled).
        def persist_thresholds!(position)
          incoming = Array(params[:thresholds]).map do |t|
            raw = t.is_a?(ActionController::Parameters) ? t.to_unsafe_h : t.to_h
            raw.deep_stringify_keys
          end

          position.thresholds.destroy_all
          incoming.each do |t|
            signal = t["signal"].to_s
            next unless ::PositionThreshold::SIGNALS.include?(signal)

            value =
              case signal
              when "ecosystems"
                items = Array(t.dig("value", "items") || t["items"]).map(&:to_s)
                { "items" => items }
              when "test_ratio", "recency"
                number = (t.dig("value", "number") || t["number"]).to_f
                { "number" => number }
              end

            position.thresholds.create!(
              signal:   signal,
              operator: ::PositionThreshold::OPERATOR_FOR[signal],
              value:    value,
            )
          end
        end

        # Priorities ride as an ordered list — index in the array becomes
        # the ranking (1..4). The model derives the weight automatically
        # from ranking, so the client only sends `signal`.
        def persist_priorities!(position)
          incoming = Array(params[:priorities]).map do |p|
            raw = p.is_a?(ActionController::Parameters) ? p.to_unsafe_h : p.to_h
            raw.deep_stringify_keys
          end

          position.priorities.destroy_all
          incoming.each_with_index do |p, i|
            signal = p["signal"].to_s
            next unless ::PositionPriority::SIGNALS.include?(signal)
            next if i >= ::Position::ACTIVE_RANKING_RANGE.size
            position.priorities.create!(signal: signal, ranking: i + 1)
          end
        end

        def serialize(position)
          {
            id:           position.id,
            title:        position.title,
            description:  position.description,
            location:     position.location,
            technologies: position.technologies || [],
            sections:     position.sections     || {},
            status:       position.status,
            activated_at: position.activated_at&.iso8601,
            expires_at:   position.expires_at&.iso8601,
            thresholds:   position.thresholds.order(:signal).map { |t| serialize_threshold(t) },
            priorities:   position.priorities.order(:ranking).map { |p| serialize_priority(p) },
            archived:     position.archived_at.present?,
            archived_at:  position.archived_at&.iso8601,
            created_at:   position.created_at.iso8601,
          }
        end

        def serialize_threshold(t)
          {
            signal:   t.signal,
            operator: t.operator,
            value:    t.value,
          }
        end

        def serialize_priority(p)
          {
            signal:  p.signal,
            ranking: p.ranking,
            weight:  p.weight.to_f,
          }
        end

        def matches_payload(position)
          rows = position.matches.includes(:account).ranked
          thresholds_by_signal = position.thresholds.index_by(&:signal)
          {
            calculated_at: rows.maximum(:calculated_at)&.iso8601,
            matches:       rows.select { |r| r.match_type == "match" }.map     { |r| serialize_match(r, thresholds_by_signal) },
            near_miss:     rows.select { |r| r.match_type == "near_miss" }.map { |r| serialize_match(r, thresholds_by_signal) },
          }
        end

        def serialize_match(m, thresholds_by_signal = {})
          acc = m.account
          bundle = ::Positions::Matcher.latest_eligible_bundle(acc)
          payload = {
            account_id:    acc.id,
            dev_handle:    acc.handle_or_fingerprint,
            bundle_slug:   bundle&.url_slug,
            score:         m.score.to_f.round,
            score_decimal: m.score.to_f,
            match_type:    m.match_type,
            failed_signal: m.failed_signal,
            calculated_at: m.calculated_at.iso8601,
          }
          if m.match_type == "near_miss" && m.failed_signal
            payload[:failed_detail] = failed_detail(acc, bundle, m.failed_signal,
                                                   thresholds_by_signal[m.failed_signal])
            payload[:curve] = ::Positions::EvolutionCurve.for(acc, m.failed_signal)
          end
          payload
        end

        # Builds the "25% · exigido: 30%" or "React ausente" inline detail
        # shown next to each near-miss row. Caller picks the right shape based
        # on `failed_signal`. Returns nil-shaped fields when data is missing
        # so the frontend can render a sensible fallback ("—").
        def failed_detail(account, bundle, signal, threshold)
          return {} unless bundle

          signals = ::Positions::Matcher.extract_signals(bundle)
          case signal
          when "ecosystems"
            wanted  = threshold ? threshold.items.map { |i| i.to_s.downcase } : []
            present = signals[:ecosystems]
            missing = wanted.reject { |w| present.include?(w) }
            { missing_items: missing }
          when "test_ratio"
            {
              current:   signals[:test_ratio],
              threshold: threshold&.number,
            }
          when "recency"
            {
              current:   signals[:recency],   # dias desde último bundle
              threshold: threshold&.number,
            }
          else
            {}
          end
        end

        # Runs the matcher inline. Acceptable for the directory size we
        # expect at this stage; once the diretório passa de ~500 devs por
        # empresa, mover para Sidekiq (PerformLater) preservando este método
        # como o sink final.
        def recalculate_matches!(position)
          ::Positions::Matcher.calculate!(position)
        rescue StandardError => e
          Rails.logger.error("[Matcher] position=#{position.id} failed: #{e.class}: #{e.message}")
          # Não derruba a requisição do recrutador — o motor pode rodar
          # novamente via POST /matches/recalculate quando o problema for
          # resolvido. Falhas mais comuns aqui são dados malformados no
          # bundle_data de algum dev (chave faltando etc.).
        end
      end
    end
  end
end
