require "rails_helper"

RSpec.describe GithubOauth do
  around do |ex|
    id_was     = ENV["GITHUB_OAUTH_CLIENT_ID"]
    secret_was = ENV["GITHUB_OAUTH_CLIENT_SECRET"]
    ex.run
    ENV["GITHUB_OAUTH_CLIENT_ID"]     = id_was
    ENV["GITHUB_OAUTH_CLIENT_SECRET"] = secret_was
  end

  describe ".client_id" do
    it "retorna o valor da env var" do
      ENV["GITHUB_OAUTH_CLIENT_ID"] = "abc123"
      expect(described_class.client_id).to eq("abc123")
    end

    it "estoura MissingConfiguration quando vazio" do
      ENV["GITHUB_OAUTH_CLIENT_ID"] = ""
      expect { described_class.client_id }.to raise_error(
        GithubOauth::MissingConfiguration, /GITHUB_OAUTH_CLIENT_ID/,
      )
    end

    it "estoura MissingConfiguration quando ausente" do
      ENV.delete("GITHUB_OAUTH_CLIENT_ID")
      expect { described_class.client_id }.to raise_error(
        GithubOauth::MissingConfiguration, /GITHUB_OAUTH_CLIENT_ID/,
      )
    end
  end

  describe ".client_secret" do
    it "retorna o valor da env var" do
      ENV["GITHUB_OAUTH_CLIENT_SECRET"] = "shh"
      expect(described_class.client_secret).to eq("shh")
    end

    it "estoura MissingConfiguration quando vazio" do
      ENV["GITHUB_OAUTH_CLIENT_SECRET"] = ""
      expect { described_class.client_secret }.to raise_error(
        GithubOauth::MissingConfiguration, /GITHUB_OAUTH_CLIENT_SECRET/,
      )
    end
  end
end
