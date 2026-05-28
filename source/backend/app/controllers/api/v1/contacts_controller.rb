# Recruiter → dev contact, JSON API for the SPA at
# `:5173/accounts/:account_id/contact`. Mirrors the existing server-rendered
# ContactsController contract: 404 when the account opted out or has no
# bundle; 401 (JSON) when the recruiter isn't logged in.

module Api
  module V1
    class ContactsController < ApplicationController
      include ActionController::Cookies
      include CompanyAuthenticated

      # Override the concern's HTML redirect.
      def authenticate_company!
        company_id = cookies.signed[CompanyAuthenticated::COOKIE_NAME]
        @current_company = ::Company.find_by(id: company_id) if company_id.present?
        return if @current_company

        cookies.delete(CompanyAuthenticated::COOKIE_NAME) if company_id.present?
        render json: { ok: false, error: "unauthenticated" }, status: :unauthorized
      end

      # GET /api/v1/accounts/:account_id/contact
      def show
        account = lookup_target_account
        return if account.nil?

        bundle  = account.bundles.active.where(visible: true).order(:last_bundle_at).last
        signals = bundle ? ::Positions::BundleSignals.from(bundle) : nil

        # Apenas dados públicos (mesmos já expostos em /directory e /v/:slug).
        # NUNCA email_contact / phone_contact / email_recovery.
        render json: {
          ok: true,
          account: {
            id:             account.id,
            handle:         account.display_handle,
            bundle_slug:    bundle&.url_slug,
            status:         bundle&.status&.to_s,
            ecosystems:     signals&.ecosystems || [],
            test_ratio:     signals&.test_ratio,
            last_bundle_at: bundle&.last_bundle_at&.iso8601,
          },
          # Mensagens que ESTA empresa já enviou a este dev (corpo completo — são
          # da própria empresa). Dá contexto antes de mandar outra; o front
          # destaca as pendentes (sem resposta).
          previous_messages: previous_messages_for(account),
        }
      end

      # POST /api/v1/accounts/:account_id/contact
      def create
        account = lookup_target_account
        return if account.nil?

        job_title = params[:job_title].to_s.strip.presence
        body      = params[:body].to_s.strip.presence

        # Contato atrelado à vaga: havendo uma mensagem pendente (sem resposta)
        # a este dev, a nova mensagem herda a MESMA vaga — o cliente não pode
        # trocar a vaga de um contato em aberto.
        pending = @current_company.messages
                    .where(account: account, responded_at: nil, ignored_at: nil)
                    .order(sent_at: :desc).first
        job_title = pending.job_title if pending

        if job_title.nil? && body.nil?
          return render json: { ok: false, error: "missing_content",
                                message: "Inclua um cargo ou uma mensagem." },
                        status: :unprocessable_entity
        end

        message = Message.create!(
          company:   @current_company,
          account:   account,
          job_title: job_title,
          body:      body || job_title,
          sent_at:   Time.current,
        )
        render json: { ok: true, message_id: message.id }, status: :created
      end

      private

      # 404 (JSON) on any of: bad id, opt-out, no active bundle. Returns nil
      # after rendering so the caller can short-circuit.
      def lookup_target_account
        account = Account.find_by(id: params[:account_id])
        unavailable! && (return nil) if account.nil?
        unavailable! && (return nil) unless account.directory?
        unavailable! && (return nil) if account.bundles.active.none?
        account
      end

      def unavailable!
        render json: { ok: false, error: "unavailable" }, status: :not_found
        true
      end

      def previous_messages_for(account)
        @current_company.messages
          .where(account: account)
          .order(sent_at: :desc)
          .map do |m|
            {
              id:           m.id,
              job_title:    m.job_title,
              body:         m.body,
              reply_body:   m.reply_body,
              sent_at:      m.sent_at.iso8601,
              responded_at: m.responded_at&.iso8601,
              status:       m.responded? ? "responded" : (m.ignored? ? "ignored" : "pending"),
            }
          end
      end
    end
  end
end
