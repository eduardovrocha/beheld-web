# Recruiter signup. A successful POST persists the Company *and* mails the
# first magic link in the same request — no separate "verify your email"
# step before the user can log in.

class CompaniesController < ActionController::Base
  MAGIC_LINK_TTL = 30.minutes

  layout "public"
  protect_from_forgery with: :exception

  def new
    @company = Company.new
  end

  def create
    @company = Company.new(company_params)
    if @company.save
      issue_magic_link(@company)
      render :confirm
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def company_params
    params.require(:company).permit(:name, :email)
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
