# JSON API for the SPA at :5173/directory.
#
# Mirrors DirectoryController#index — same JSONB filters, same scope rules
# (directory: true, bundles not revoked) — but returns JSON instead of an
# HTML view. Authenticated by the signed `_beheld_company_session` cookie
# the company minted via `POST /api/v1/sessions/company/verify`.

module Api
  module V1
    class DirectoryController < ApplicationController
      include ActionController::Cookies
      include CompanyAuthenticated

      RESULT_LIMIT        = 50
      PUBLISHED_FRESHNESS = 30.days

      # Override the concern's redirect (HTML semantics) with a JSON 401.
      def authenticate_company!
        company_id = cookies.signed[CompanyAuthenticated::COOKIE_NAME]
        @current_company = ::Company.find_by(id: company_id) if company_id.present?
        return if @current_company

        cookies.delete(CompanyAuthenticated::COOKIE_NAME) if company_id.present?
        render json: { ok: false, error: "unauthenticated" }, status: :unauthorized
      end

      def index
        accounts = apply_filters(base_scope).limit(RESULT_LIMIT).to_a

        render json: {
          ok:                    true,
          company:               { id: @current_company.id, name: @current_company.name },
          available_ecosystems:  collect_ecosystems(accounts),
          filters:               filter_state,
          results:               accounts.map { |a| dev_json(a) },
        }
      end

      private

      def base_scope
        Account
          .where(directory: true)
          .joins(:bundles)
          .where(bundles: { revoked_at: nil })
          .includes(bundles: :verifications)
          .distinct
      end

      def apply_filters(scope)
        scope = filter_by_ecosystems(scope, picked_ecosystems)
        scope = filter_by_test_ratio(scope, params[:test_ratio_min], params[:test_ratio_max])
        scope = filter_by_status(scope, params[:status])
        scope
      end

      def picked_ecosystems
        eco = params[:ecosystems]
        lang = params[:languages]
        raw = (eco.is_a?(Array) ? eco : []) + (lang.is_a?(Array) ? lang : [])
        raw.compact_blank.uniq
      end

      def filter_by_ecosystems(scope, ecosystems)
        return scope if ecosystems.empty?
        conn = ActiveRecord::Base.connection
        literal = ecosystems.map { |e| conn.quote(e) }.join(",")
        scope.where(
          "jsonb_exists_any(bundles.bundle_data #> '{payload,l1,ecosystems}', ARRAY[#{literal}]::text[])",
        )
      end

      def filter_by_test_ratio(scope, min, max)
        min_f = parse_ratio(min)
        max_f = parse_ratio(max)
        return scope if min_f.nil? && max_f.nil?

        expr = "(bundles.bundle_data #>> ARRAY['payload','l1','avg_test_ratio'])::float"
        scope = scope.where("#{expr} >= ?", min_f) if min_f
        scope = scope.where("#{expr} <= ?", max_f) if max_f
        scope
      end

      def filter_by_status(scope, status)
        case status
        when "verified" then scope.where("bundles.last_bundle_at > ?",  PUBLISHED_FRESHNESS.ago)
        when "outdated" then scope.where("bundles.last_bundle_at <= ?", PUBLISHED_FRESHNESS.ago)
        else                 scope
        end
      end

      def parse_ratio(value)
        return nil if value.blank?
        f = Float(value, exception: false)
        return nil if f.nil?
        f.clamp(0.0, 1.0)
      end

      def filter_state
        {
          ecosystems:     params[:ecosystems].is_a?(Array) ? params[:ecosystems] : [],
          test_ratio_min: params[:test_ratio_min].to_s,
          test_ratio_max: params[:test_ratio_max].to_s,
          status:         params[:status].to_s.presence || "all",
        }
      end

      def collect_ecosystems(accounts)
        accounts
          .flat_map { |a| a.bundles.flat_map { |b| extract_keys(b.bundle_data, %w[payload l1 ecosystems]) } }
          .compact.uniq.sort
      end

      def extract_keys(hash, path)
        return [] unless hash.is_a?(Hash)
        node = path.reduce(hash) { |acc, key| acc.is_a?(Hash) ? acc[key] : nil }
        node.is_a?(Hash) ? node.keys : []
      end

      def dev_json(account)
        bundle = account.bundles.max_by(&:last_bundle_at)
        payload = (bundle&.bundle_data || {})["payload"] || {}
        l1      = payload["l1"] || {}

        {
          account_id:     account.id,
          handle:         account.display_handle,
          slug:           bundle&.url_slug,
          ecosystems:     (l1["ecosystems"] || {}).keys.first(5),
          platforms:      (l1["platforms"]  || {}).keys.first(5),
          test_ratio:     l1["avg_test_ratio"],
          last_bundle_at: bundle&.last_bundle_at&.iso8601,
          status:         bundle&.status&.to_s,
        }
      end
    end
  end
end
