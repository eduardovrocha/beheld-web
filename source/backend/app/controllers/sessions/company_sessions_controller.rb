# Magic-link login for recruiters.
#
# Two phases:
#   1. `create`  → e-mail the link to whoever owns the supplied email.
#   2. `verify`  → consume the token, set a signed session cookie, redirect
#                  the recruiter into the directory.
#
# The MagicLink is single-use AND TTL-bound (30 min). Both bounds are
# enforced via MagicLink#usable?.

module Sessions
  class CompanySessionsController < ActionController::Base
    MAGIC_LINK_TTL = 30.minutes

    layout "public"
    protect_from_forgery with: :exception

    def new
    end

    def create
      email = params[:email].to_s.strip.downcase
      company = Company.find_by("LOWER(email) = ?", email)
      if company.nil?
        flash[:alert] = "Email não cadastrado."
        return redirect_to new_company_path
      end

      MagicLink.create!(
        company:    company,
        token:      SecureRandom.hex(32),
        expires_at: MAGIC_LINK_TTL.from_now,
        created_at: Time.current,
      ).tap { |link| CompanyMailer.magic_link(company, link.token).deliver_later }

      render :sent
    end

    def verify
      link = MagicLink.find_by(token: params[:token].to_s)
      if link.nil? || !link.usable?
        @reason = link.nil? ? :not_found : (link.expired? ? :expired : :used)
        return render :invalid, status: :unauthorized
      end

      link.update!(used_at: Time.current)
      cookies.signed[CompanyAuthenticated::COOKIE_NAME] = {
        value:     link.company_id,
        httponly:  true,
        same_site: :lax,
        secure:    Rails.env.production?,
        expires:   30.days.from_now,
      }
      redirect_to "/directory"
    end

    def destroy
      cookies.delete(CompanyAuthenticated::COOKIE_NAME)
      redirect_to new_company_session_path, notice: "Sessão encerrada."
    end
  end
end
