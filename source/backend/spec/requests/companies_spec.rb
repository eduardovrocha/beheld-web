require "rails_helper"

RSpec.describe "Companies", type: :request do
  describe "GET /companies/new" do
    it "renders the signup form" do
      get "/companies/new"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Cadastro de empresa")
      expect(response.body).to include("Email corporativo")
    end
  end

  describe "POST /companies" do
    let(:valid_params) do
      { company: { name: "Acme Corp", email: "hr@acme.example" } }
    end

    around do |ex|
      perform_enqueued_jobs do
        ex.run
      end
    end

    before { ActionMailer::Base.deliveries.clear }

    it "creates the company, mails the magic link, and renders the confirmation page" do
      expect {
        post "/companies", params: valid_params
      }.to change(Company, :count).by(1)
        .and change(MagicLink, :count).by(1)
        .and change(ActionMailer::Base.deliveries, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Verifique seu email")
      expect(response.body).to include("hr@acme.example")

      mail = ActionMailer::Base.deliveries.last
      expect(mail.to).to eq(["hr@acme.example"])
      expect(mail.subject).to eq("Seu link de acesso ao beheld")
    end

    it "renders the form with errors when the email is missing" do
      expect {
        post "/companies", params: { company: { name: "Acme", email: "" } }
      }.not_to change(Company, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("Cadastro de empresa")
    end

    it "rejects a duplicate email (unique index on companies.email)" do
      create(:company, email: "hr@acme.example")
      expect {
        post "/companies", params: valid_params
      }.not_to change(Company, :count)

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
