# Full list of outbound messages this company has sent.

module Api
  module V1
    module Company
      class MessagesController < BaseController
        EXCERPT_CHARS = 80

        def index
          messages = current_company.messages
            .order(sent_at: :desc)
            .includes(account: :bundles)

          render json: messages.map { |m| serialize(m) }
        end

        private

        def serialize(m)
          {
            id:           m.id,
            account_id:   m.account_id,
            dev_handle:   m.account.handle_or_fingerprint,
            bundle_slug:  m.account.bundles.active.last&.url_slug,
            job_title:    m.job_title,
            body_excerpt: m.body.to_s.truncate(EXCERPT_CHARS),
            status:       message_status(m),
            sent_at:      m.sent_at.iso8601,
            responded_at: m.responded_at&.iso8601,
            reply_body:   m.reply_body,
          }
        end
      end
    end
  end
end
