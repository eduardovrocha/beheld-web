require "rails_helper"

RSpec.describe GithubApiClient do
  describe ".authorize_url" do
    it "constrói URL com client_id, redirect_uri, state e scope encoded" do
      url = described_class.authorize_url(
        client_id:    "cid",
        redirect_uri: "https://devprofile.info/api/auth/github/callback",
        state:        "abc123",
      )
      expect(url).to start_with("https://github.com/login/oauth/authorize?")
      expect(url).to include("client_id=cid")
      expect(url).to include("redirect_uri=https%3A%2F%2Fdevprofile.info%2Fapi%2Fauth%2Fgithub%2Fcallback")
      expect(url).to include("state=abc123")
      expect(url).to include("scope=read%3Auser")
    end
  end

  describe ".exchange_code_for_token" do
    it "retorna access_token quando GitHub aceita o code" do
      stub_request(:post, "https://github.com/login/oauth/access_token")
        .with(body: hash_including("code" => "good-code"))
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: { access_token: "gho_xxxxxxxxx", token_type: "bearer", scope: "read:user" }.to_json,
        )

      token = described_class.exchange_code_for_token(
        code: "good-code", client_id: "cid", client_secret: "csec",
        redirect_uri: "https://devprofile.info/api/auth/github/callback",
      )
      expect(token).to eq("gho_xxxxxxxxx")
    end

    it "estoura OAuthError quando GitHub responde com erro JSON" do
      stub_request(:post, "https://github.com/login/oauth/access_token").to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: { error: "bad_verification_code", error_description: "The code is bad" }.to_json,
      )
      expect {
        described_class.exchange_code_for_token(
          code: "bad", client_id: "cid", client_secret: "csec",
          redirect_uri: "https://x/cb",
        )
      }.to raise_error(GithubApiClient::OAuthError, /bad_verification_code/)
    end

    it "estoura OAuthError quando GitHub responde com 5xx" do
      stub_request(:post, "https://github.com/login/oauth/access_token").to_return(status: 500, body: "boom")
      expect {
        described_class.exchange_code_for_token(
          code: "c", client_id: "x", client_secret: "y", redirect_uri: "https://x",
        )
      }.to raise_error(GithubApiClient::OAuthError, /500/)
    end

    it "estoura OAuthError quando resposta não é JSON parseável" do
      stub_request(:post, "https://github.com/login/oauth/access_token").to_return(
        status: 200, headers: { "Content-Type" => "application/json" }, body: "not json {{",
      )
      expect {
        described_class.exchange_code_for_token(
          code: "c", client_id: "x", client_secret: "y", redirect_uri: "https://x",
        )
      }.to raise_error(GithubApiClient::OAuthError, /invalid JSON/)
    end
  end

  describe ".fetch_user" do
    it "retorna o hash do usuário com id e login" do
      stub_request(:get, "https://api.github.com/user")
        .with(headers: { "Authorization" => "Bearer gho_xxx" })
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: { id: 12345, login: "octocat", name: "The Octocat" }.to_json,
        )

      user = described_class.fetch_user(access_token: "gho_xxx")
      expect(user["id"]).to eq(12345)
      expect(user["login"]).to eq("octocat")
    end

    it "estoura OAuthError em 401" do
      stub_request(:get, "https://api.github.com/user").to_return(status: 401, body: "Bad credentials")
      expect { described_class.fetch_user(access_token: "x") }.to raise_error(
        GithubApiClient::OAuthError, /401/,
      )
    end
  end
end
