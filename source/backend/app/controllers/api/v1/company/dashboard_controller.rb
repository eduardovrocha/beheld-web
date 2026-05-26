# Company dashboard summary — totals, response rate, and an interleaved feed
# of the most recent verifications + outbound messages.
#
# Privacy: this controller never exposes dev contact details
# (email_contact / phone_contact / email_recovery) or any SavedDev note
# (notes are strictly private to the recruiter who saved them).

module Api
  module V1
    module Company
      class DashboardController < BaseController
        RECENT_LIMIT = 20

        def index
          render json: {
            stats:           build_stats,
            recent_activity: build_activity,
          }
        end

        private

        def build_stats
          verifications_total = current_company.verifications.count
          messages_total      = current_company.messages.count
          messages_responded  = current_company.messages.where.not(responded_at: nil).count
          saved_devs_total    = current_company.saved_devs.count

          response_rate = messages_total > 0 ? (messages_responded.to_f / messages_total * 100).round : nil

          {
            verifications_total: verifications_total,
            messages_total:      messages_total,
            messages_responded:  messages_responded,
            response_rate:       response_rate,
            saved_devs_total:    saved_devs_total,
          }
        end

        def build_activity
          verifications = current_company.verifications
            .order(verified_at: :desc)
            .includes(bundle: :account)
            .limit(10)
            .map do |v|
              acc = v.bundle&.account
              {
                type:        "verification",
                dev_handle:  acc&.handle_or_fingerprint,
                bundle_slug: v.bundle&.url_slug,
                job_title:   v.job_title,
                at:          v.verified_at.iso8601,
              }
            end

          messages = current_company.messages
            .order(sent_at: :desc)
            .includes(:account)
            .limit(10)
            .map do |m|
              {
                type:       "message",
                dev_handle: m.account.handle_or_fingerprint,
                job_title:  m.job_title,
                status:     message_status(m),
                at:         m.sent_at.iso8601,
              }
            end

          (verifications + messages).sort_by { |e| e[:at] }.reverse.first(RECENT_LIMIT)
        end
      end
    end
  end
end
