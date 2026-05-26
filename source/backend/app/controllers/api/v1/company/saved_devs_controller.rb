# Recruiter-private dev bookmarks. The `note` field stays inside this
# controller — every other endpoint that touches `saved_devs` (dashboard
# stats, messages list, etc.) drops it.
#
# Authorization: each action loads the SavedDev *scoped to the current
# company*, so a recruiter who tries to PATCH/DELETE a row that belongs to
# another company gets a 404 (we don't distinguish "doesn't exist" from
# "not yours" — both surface as not_found).

module Api
  module V1
    module Company
      class SavedDevsController < BaseController
        def index
          saved = current_company.saved_devs
            .order(saved_at: :desc)
            .includes(account: :bundles)

          render json: saved.map { |s| serialize(s) }
        end

        def create
          account = ::Account.find_by(id: params[:account_id])
          return render(json: { ok: false, error: "account_not_found" }, status: :not_found) if account.nil?

          saved = current_company.saved_devs.find_or_initialize_by(account: account)
          saved.note     = params[:note].presence
          saved.saved_at = Time.current if saved.new_record?
          saved.save!

          render json: { ok: true, saved_dev: serialize(saved) }, status: :created
        end

        def update
          saved = current_company.saved_devs.find_by!(account_id: params[:account_id])
          saved.update!(note: params[:note].presence)
          render json: { ok: true, saved_dev: serialize(saved) }
        end

        def destroy
          saved = current_company.saved_devs.find_by!(account_id: params[:account_id])
          saved.destroy!
          render json: { ok: true }
        end

        private

        def serialize(saved)
          bundle = saved.account.bundles.active.max_by(&:last_bundle_at)
          {
            account_id:    saved.account_id,
            dev_handle:    saved.account.handle_or_fingerprint,
            bundle_slug:   bundle&.url_slug,
            bundle_status: bundle&.status&.to_s,
            note:          saved.note,
            saved_at:      saved.saved_at.iso8601,
          }
        end
      end
    end
  end
end
