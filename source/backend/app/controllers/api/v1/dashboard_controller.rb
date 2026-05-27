# JSON API consumed by the SPA dashboard at beheld.dev/dashboard (Vite SPA
# served from :5173 in dev). Same data the server-rendered HTML dashboard
# uses — just shaped as JSON. Auth: DevAuthenticated reads the bearer token
# the SPA sends after exchanging `?session=` for an in-memory secret.

module Api
  module V1
    class DashboardController < ApplicationController
      include DevAuthenticated

      rescue_from ActiveRecord::RecordNotFound do
        render json: { error: "not_found" }, status: :not_found
      end

      # GET /api/v1/dashboard
      def index
        render json: dashboard_payload
      end

      # PATCH /api/v1/dashboard/settings
      def update_settings
        current_account.update!(settings_params)
        render json: dashboard_payload
      end

      # DELETE /api/v1/dashboard/bundles/:id
      def revoke_bundle
        bundle = current_account.bundles.find(params[:id])
        bundle.update!(revoked_at: Time.current)
        render json: dashboard_payload
      end

      # PATCH /api/v1/dashboard/bundles/:id/toggle
      def toggle_bundle
        bundle = current_account.bundles.find(params[:id])
        bundle.update!(visible: !bundle.visible)
        render json: dashboard_payload
      end

      # POST /api/v1/dashboard/messages/:id/respond
      def respond_message
        msg = current_account.messages.find(params[:id])
        unless current_account.contact_configured?
          return render json: { error: "contact_not_configured" }, status: :unprocessable_entity
        end
        msg.update!(responded_at: Time.current)
        RespondContactJob.perform_later(msg.id)
        render json: dashboard_payload
      end

      # POST /api/v1/dashboard/messages/:id/ignore
      def ignore_message
        msg = current_account.messages.find(params[:id])
        msg.update!(ignored_at: Time.current)
        render json: dashboard_payload
      end

      private

      def current_account
        @current_account
      end

      def settings_params
        permitted = params.permit(
          :email_recovery, :email_contact, :phone_contact,
          :directory, :watch,
          :notification_email, :notification_webhook,
        )
        permitted[:directory] = ActiveModel::Type::Boolean.new.cast(permitted[:directory]) if permitted.key?(:directory)
        permitted[:watch]     = ActiveModel::Type::Boolean.new.cast(permitted[:watch])     if permitted.key?(:watch)
        permitted
      end

      def dashboard_payload
        bundles = current_account.bundles.active.order(published_at: :desc)
        notifications = Verification
                          .where(bundle_id: bundles.pluck(:id))
                          .where.not(company_id: nil)
                          .order(verified_at: :desc)
                          .includes(:company)
                          .limit(50)
        messages = current_account.messages.order(sent_at: :desc).includes(:company)

        {
          account: {
            id:                   current_account.id.to_s,
            fingerprint:          current_account.fingerprint,
            handle:               current_account.display_handle,
            email_recovery:       current_account.email_recovery,
            email_contact:        current_account.email_contact,
            phone_contact:        current_account.phone_contact,
            directory:            current_account.directory,
            watch:                current_account.watch,
            notification_email:   current_account.notification_email,
            notification_webhook: current_account.notification_webhook,
            contact_configured:   current_account.contact_configured?,
          },
          bundles: bundles.map { |b| bundle_json(b) },
          notifications: notifications.map { |v| verification_json(v) },
          messages: messages.map { |m| message_json(m) },
          # P21: anonymous interest counter. Just the integer — no company
          # names, no position titles, no scores. The matcher persists rows
          # in `position_matches`, and DevInterest filters to active +
          # confirmed matches only.
          interest: {
            companies: ::Positions::DevInterest.count_for(current_account),
          },
          # P22.2: the dev's evolution curve indicator. Only test_ratio has
          # a real trend; the dashboard card displays `points` and the days
          # since the last bundle so the dev sees how rich their curve is.
          evolution: build_evolution_indicator(bundles),
        }
      end

      def build_evolution_indicator(bundles)
        latest = bundles.first   # already ordered DESC by published_at
        {
          points:               bundles.size,
          last_bundle_at:       latest&.last_bundle_at&.iso8601,
          days_since_last:      latest ? ((Time.current - latest.last_bundle_at) / 86_400.0).round : nil,
          stale_for_curve:      latest && ((Time.current - latest.last_bundle_at) / 86_400.0) >= 5,
        }
      end

      def bundle_json(b)
        {
          id:                 b.id.to_s,
          url_slug:           b.url_slug,
          published_at:       b.published_at.iso8601,
          last_bundle_at:     b.last_bundle_at.iso8601,
          status:             b.status.to_s,
          visible:            b.visible,
          verifications_count: b.verifications.size,
        }
      end

      def verification_json(v)
        {
          id:          v.id.to_s,
          company:     v.company&.name,
          job_title:   v.job_title,
          area:        v.area,
          verified_at: v.verified_at.iso8601,
        }
      end

      def message_json(m)
        {
          id:           m.id.to_s,
          company:      m.company.name,
          job_title:    m.job_title,
          body:         m.body,
          sent_at:      m.sent_at.iso8601,
          responded_at: m.responded_at&.iso8601,
          ignored_at:   m.ignored_at&.iso8601,
          state:        (m.pending? ? "pending" : m.responded? ? "responded" : "ignored"),
        }
      end
    end
  end
end
