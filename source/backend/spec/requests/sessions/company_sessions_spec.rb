require "rails_helper"

RSpec.describe "Sessions::CompanySessions", type: :request do
  let(:company) { create(:company, email: "hr@acme.example") }

  describe "GET /sessions/company/new" do
    it "renders the login form" do
      get "/sessions/company/new"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Entrar como empresa")
    end
  end

  describe "POST /sessions/company" do
    around do |ex|
      perform_enqueued_jobs { ex.run }
    end

    before { ActionMailer::Base.deliveries.clear }

    it "creates a MagicLink and mails the link when the email matches a Company" do
      expect {
        post "/sessions/company", params: { email: company.email }
      }.to change(MagicLink, :count).by(1)
        .and change(ActionMailer::Base.deliveries, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Link enviado")

      mail = ActionMailer::Base.deliveries.last
      link = MagicLink.where(company: company).last
      expect(mail.to).to eq([company.email])
      expect(mail.text_part.body.to_s).to include(link.token)
    end

    it "accepts a case-insensitive email match" do
      expect {
        post "/sessions/company", params: { email: company.email.upcase }
      }.to change(MagicLink, :count).by(1)

      expect(response).to have_http_status(:ok)
    end

    it "redirects to /companies/new when the email is not registered" do
      expect {
        post "/sessions/company", params: { email: "stranger@example.com" }
      }.not_to change(MagicLink, :count)

      expect(response).to redirect_to("/companies/new")
      follow_redirect!
      # flash carried through the redirect
      expect(response.body).to include("Email não cadastrado")
    end
  end

  describe "GET /sessions/company/verify" do
    let(:link) do
      MagicLink.create!(
        company:    company,
        token:      SecureRandom.hex(32),
        expires_at: 10.minutes.from_now,
        created_at: Time.current,
      )
    end

    it "consumes the token and redirects to /directory" do
      expect {
        get "/sessions/company/verify", params: { token: link.token }
      }.to change { link.reload.used_at }.from(nil).to(be_present)

      expect(response).to redirect_to("/directory")
      # Signed cookie set — best-effort assertion (we don't decode it here).
      expect(response.headers["Set-Cookie"]).to include("_beheld_company_session=")
    end

    it "renders 401 + clear message when the token has expired" do
      link.update!(expires_at: 1.minute.ago)

      get "/sessions/company/verify", params: { token: link.token }

      expect(response).to have_http_status(:unauthorized)
      expect(response.body).to include("Link inválido ou expirado")
      expect(response.body).to include("passou da validade")
    end

    it "renders 401 + clear message when the token has already been used" do
      link.update!(used_at: 1.minute.ago)

      get "/sessions/company/verify", params: { token: link.token }

      expect(response).to have_http_status(:unauthorized)
      expect(response.body).to include("já foi usado")
    end

    it "renders 401 when the token doesn't exist at all" do
      get "/sessions/company/verify", params: { token: "deadbeef" }

      expect(response).to have_http_status(:unauthorized)
      expect(response.body).to include("Não encontramos esse link")
    end
  end

  describe "DELETE /sessions/company" do
    it "clears the company session cookie and redirects to the login form" do
      delete "/sessions/company"
      expect(response).to redirect_to("/sessions/company/new")
    end
  end
end
