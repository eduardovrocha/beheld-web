# Recruiter signup, JSON API for the SPA at /companies/new (Vite on :5173).
#
# Mirrors the existing server-rendered CompaniesController#create: validate,
# persist, issue a one-shot magic link, mail it. Returns 201 with the email
# so the SPA can render the "verify your inbox" confirmation; 422 with the
# model's validation errors otherwise.

module Api
  module V1
    class CompaniesController < ApplicationController
      MAGIC_LINK_TTL = 30.minutes

      def create
        company = Company.new(company_params)

        if company.save
          issue_magic_link(company)
          render json: { ok: true, email: company.email, name: company.name }, status: :created
        else
          render json: { ok: false, errors: company.errors.as_json(full_messages: true) },
                 status: :unprocessable_entity
        end
      end

      private

      def company_params
        params.permit(:name, :email).tap do |p|
          p[:email] = p[:email].to_s.strip.downcase if p[:email]
        end
      end

      def issue_magic_link(company)
        link = MagicLink.create!(
          company:    company,
          token:      SecureRandom.hex(32),
          expires_at: MAGIC_LINK_TTL.from_now,
          created_at: Time.current,
        )
        CompanyMailer.magic_link(company, link.token).deliver_later
      end
    end
  end
end
