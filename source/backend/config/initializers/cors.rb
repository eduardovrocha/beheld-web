# Cross-origin requests from browser frontends consuming this API.
#
# Two allow-blocks:
#   1. Public reads (no cookies) — wildcard origins so anyone can fetch
#      /v/:slug JSON, badges, platform keys, etc.
#   2. Cookie-bound flows (recruiter session) — explicit origins so the
#      browser will actually send/accept `_beheld_company_session`. CORS
#      forbids credentials + wildcard origin in the same response, so this
#      block is constrained on purpose.
#
# Override either list via env: CORS_ORIGINS (public) or
# CORS_CREDENTIAL_ORIGINS (cookie-bound), comma-separated.

PUBLIC_ORIGINS = ENV.fetch("CORS_ORIGINS", "*").split(",").map(&:strip).freeze
CREDENTIAL_ORIGINS = ENV.fetch(
  "CORS_CREDENTIAL_ORIGINS",
  "http://localhost:5173,http://127.0.0.1:5173,https://beheld.dev",
).split(",").map(&:strip).freeze

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  # Credentialed paths FIRST — rack-cors uses the first matching `allow`
  # block, and the wildcard block below would otherwise return
  # `Access-Control-Allow-Origin: *`, which the browser refuses to combine
  # with credentials.
  allow do
    origins(*CREDENTIAL_ORIGINS)
    resource "/api/v1/sessions/*",
      headers:     :any,
      methods:     %i[get post put patch delete options head],
      credentials: true
    resource "/api/v1/dashboard*",
      headers:     :any,
      methods:     %i[get post put patch delete options head],
      credentials: true
    resource "/api/v1/directory*",
      headers:     :any,
      methods:     %i[get post put patch delete options head],
      credentials: true
    resource "/api/v1/accounts/*",
      headers:     :any,
      methods:     %i[get post put patch delete options head],
      credentials: true
    resource "/api/v1/company/*",
      headers:     :any,
      methods:     %i[get post put patch delete options head],
      credentials: true
  end

  # Public reads — every other path stays wildcard-permissive.
  allow do
    origins(*PUBLIC_ORIGINS)
    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      expose:  ["Authorization", "X-Beheld-Account-Id"]
  end
end
