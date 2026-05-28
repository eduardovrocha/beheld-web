require "rails_helper"

RSpec.describe "Contacts (recruiter → dev message)", type: :request do
  let(:company) { create(:company) }

  def login_as(c)
    link = MagicLink.create!(
      company:    c,
      token:      SecureRandom.hex(32),
      expires_at: 10.minutes.from_now,
      created_at: Time.current,
    )
    get "/sessions/company/verify", params: { token: link.token }
  end

  def directory_dev(directory: true, with_bundle: true)
    account = create(:account, :with_contact, directory: directory)
    create(:bundle, account: account) if with_bundle
    account
  end

  describe "GET /accounts/:id/contact" do
    it "redirects unauthenticated visitors to the company login" do
      account = directory_dev
      get "/accounts/#{account.id}/contact"
      expect(response).to redirect_to(new_company_session_path)
    end

    it "renders the form for a logged-in company" do
      account = directory_dev
      login_as(company)
      get "/accounts/#{account.id}/contact"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Entrar em contato")
      expect(response.body).to include(account.display_handle)
    end

    it "404s when the account opted out of the directory" do
      account = directory_dev(directory: false)
      login_as(company)
      get "/accounts/#{account.id}/contact"
      expect(response).to have_http_status(:not_found)
    end

    it "404s when the account has no active bundle" do
      account = directory_dev(with_bundle: false)
      login_as(company)
      get "/accounts/#{account.id}/contact"
      expect(response).to have_http_status(:not_found)
    end

    it "404s for a missing account_id" do
      login_as(company)
      get "/accounts/999999/contact"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /accounts/:id/contact" do
    let(:account) { directory_dev }

    it "creates a Message and redirects with a flash" do
      login_as(company)
      expect {
        post "/accounts/#{account.id}/contact",
             params: { job_title: "Senior Backend", body: "Olá, temos uma vaga." }
      }.to change(Message, :count).by(1)

      msg = Message.last
      expect(msg.company).to eq(company)
      expect(msg.account).to eq(account)
      expect(msg.job_title).to eq("Senior Backend")
      expect(msg.body).to eq("Olá, temos uma vaga.")
      expect(msg.sent_at).to be_present
      expect(response).to redirect_to(directory_path)
    end

    it "rejects submissions with no job_title and no body" do
      login_as(company)
      expect {
        post "/accounts/#{account.id}/contact", params: { job_title: "", body: "" }
      }.not_to change(Message, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("Inclua um cargo ou uma mensagem.")
    end

    it "rejects sending to an opted-out account" do
      hidden = directory_dev(directory: false)
      login_as(company)
      expect {
        post "/accounts/#{hidden.id}/contact",
             params: { job_title: "X", body: "Y" }
      }.not_to change(Message, :count)

      expect(response).to have_http_status(:not_found)
    end

    it "trava a vaga: havendo mensagem pendente, a nova herda a mesma vaga" do
      login_as(company)
      Message.create!(company: company, account: account, job_title: "Vaga X",
                      body: "Primeira", sent_at: 1.day.ago)
      # tenta enviar uma segunda escolhendo "Vaga Y" — deve ser ignorada
      post "/accounts/#{account.id}/contact",
           params: { job_title: "Vaga Y", body: "Segunda mensagem" }
      expect(Message.last.job_title).to eq("Vaga X")
    end

    it "permite nova vaga quando a anterior já foi respondida" do
      login_as(company)
      Message.create!(company: company, account: account, job_title: "Vaga X",
                      body: "Primeira", sent_at: 2.days.ago, responded_at: 1.day.ago)
      post "/accounts/#{account.id}/contact",
           params: { job_title: "Vaga Z", body: "Nova abordagem" }
      expect(Message.last.job_title).to eq("Vaga Z")
    end
  end
end
