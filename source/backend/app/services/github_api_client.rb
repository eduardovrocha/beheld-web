# Thin Net::HTTP wrapper around the three GitHub endpoints needed for the
# attestation OAuth flow (Phase 5 / F5.6.1). No dependency on a third-party
# OAuth gem — the surface area is small enough that direct calls keep the
# moving parts visible.
require "net/http"
require "uri"
require "json"

class GithubApiClient
  AUTHORIZE_URL = "https://github.com/login/oauth/authorize".freeze
  TOKEN_URL     = "https://github.com/login/oauth/access_token".freeze
  USER_URL      = "https://api.github.com/user".freeze

  class OAuthError < StandardError; end

  def self.authorize_url(client_id:, redirect_uri:, state:, scope: "read:user")
    params = {
      client_id:    client_id,
      redirect_uri: redirect_uri,
      state:        state,
      scope:        scope,
    }
    "#{AUTHORIZE_URL}?#{URI.encode_www_form(params)}"
  end

  # Returns the access_token string. Raises OAuthError on any failure.
  def self.exchange_code_for_token(code:, client_id:, client_secret:, redirect_uri:)
    uri = URI(TOKEN_URL)
    req = Net::HTTP::Post.new(uri)
    req["Accept"] = "application/json"
    req.set_form_data(
      client_id:     client_id,
      client_secret: client_secret,
      code:          code,
      redirect_uri:  redirect_uri,
    )
    body = parse_json(perform(uri, req))
    raise OAuthError, "#{body['error']}: #{body['error_description']}" if body["error"]
    body.fetch("access_token") { raise OAuthError, "no access_token in token response" }
  end

  # Returns the parsed user hash (at minimum: "id", "login"). Raises
  # OAuthError on failure.
  def self.fetch_user(access_token:)
    uri = URI(USER_URL)
    req = Net::HTTP::Get.new(uri)
    req["Authorization"]        = "Bearer #{access_token}"
    req["Accept"]               = "application/vnd.github+json"
    req["X-GitHub-Api-Version"] = "2022-11-28"
    parse_json(perform(uri, req))
  end

  def self.perform(uri, req)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == "https")
    res = http.request(req)
    unless res.is_a?(Net::HTTPSuccess)
      raise OAuthError, "GitHub #{uri.host} returned #{res.code}: #{res.body}"
    end
    res
  end
  private_class_method :perform

  def self.parse_json(response)
    JSON.parse(response.body)
  rescue JSON::ParserError => e
    raise OAuthError, "invalid JSON from GitHub: #{e.message}"
  end
  private_class_method :parse_json
end
