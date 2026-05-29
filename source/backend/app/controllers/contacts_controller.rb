# Recruiter → dev contact form. Lives one click below /directory:
#   GET  /accounts/:account_id/contact   — form
#   POST /accounts/:account_id/contact   — persist the Message
#
# The Message lands in the dev's dashboard; from there the dev decides
# whether to "Responder" (which dispatches RespondContactJob and shares
# their email + phone) or "Ignorar".
#
# The portal NEVER passes the dev's contact details through this form path.

class ContactsController < ActionController::Base
  include LocaleSelectable
  include CompanyAuthenticated

  layout "company"
  protect_from_forgery with: :exception

  helper_method :current_company

  before_action :load_account

  def new
    return render_unavailable if @account.nil? || !@account.directory?
    @bundle = @account.bundles.active.last
    return render_unavailable if @bundle.nil?
  end

  def create
    if @account.nil? || !@account.directory? || @account.bundles.active.none?
      return render_unavailable
    end

    job_title = params[:job_title].to_s.strip.presence
    body      = params[:body].to_s.strip.presence

    # Contato atrelado à vaga: havendo mensagem pendente (sem resposta) a este
    # dev, a nova herda a MESMA vaga — não dá pra trocar a vaga em aberto.
    pending = current_company.messages
                .where(account: @account, responded_at: nil, ignored_at: nil)
                .order(sent_at: :desc).first
    job_title = pending.job_title if pending

    if job_title.nil? && body.nil?
      flash.now[:alert] = "Inclua um cargo ou uma mensagem."
      @bundle = @account.bundles.active.last
      return render :new, status: :unprocessable_entity
    end

    Message.create!(
      company:   current_company,
      account:   @account,
      job_title: job_title,
      body:      body || job_title, # body is required at DB level; fall back to title
      sent_at:   Time.current,
    )
    redirect_to directory_path, notice: I18n.t("controllers.contacts.message_sent")
  end

  private

  def load_account
    @account = Account.find_by(id: params[:account_id])
  end

  def render_unavailable
    render plain: I18n.t("controllers.contacts.profile_unavailable"), status: :not_found
  end

  def current_company
    @current_company
  end
end
