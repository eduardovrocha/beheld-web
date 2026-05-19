# OAuth GitHub flow for identity attestation (Phase 5 / F5.6.1).
#
# Two-step flow (loopback HTTP variant):
#
#   1. CLI hits `/api/auth/github/start` with `cli_state`, `cli_port`, and
#      `dev_pubkey`. We persist these against a freshly minted `gh_state`
#      in Redis and redirect the user's browser to GitHub's authorize URL.
#
#   2. GitHub redirects back to `/api/auth/github/callback` with `code` and
#      `state`. We exchange the code for an access token, fetch the user,
#      sign an attestation with the platform private key, persist it, and
#      redirect the browser to `http://localhost:<cli_port>/callback`
#      carrying a single-use `claim_code` the CLI exchanges via
#      `POST /api/attestation/claim`.

class AuthController < ApplicationController
  CLI_STATE_RE  = /\A[A-Za-z0-9_\-]{16,128}\z/.freeze
  DEV_PUBKEY_RE = /\Aed25519-pub:[A-Za-z0-9+\/=]{40,128}\z/.freeze
  CLI_PORT_RANGE = (1024..65535).freeze

  def github_start
    cli_state  = params[:cli_state].to_s
    cli_port   = params[:cli_port].to_i
    dev_pubkey = params[:dev_pubkey].to_s

    return oauth_error(:bad_request, "invalid cli_state")  unless cli_state.match?(CLI_STATE_RE)
    return oauth_error(:bad_request, "invalid cli_port")   unless CLI_PORT_RANGE.include?(cli_port)
    return oauth_error(:bad_request, "invalid dev_pubkey") unless dev_pubkey.match?(DEV_PUBKEY_RE)

    gh_state = SecureRandom.urlsafe_base64(32)
    OauthStateStore.new.put_pending(gh_state, {
      "cli_state"  => cli_state,
      "cli_port"   => cli_port,
      "dev_pubkey" => dev_pubkey,
    })

    redirect_to GithubApiClient.authorize_url(
      client_id:    GithubOauth.client_id,
      redirect_uri: github_callback_url,
      state:        gh_state,
    ), allow_other_host: true
  end

  def github_callback
    code  = params[:code].to_s
    state = params[:state].to_s

    pending = OauthStateStore.new.take_pending(state)
    return oauth_error(:bad_request, "unknown or expired state") if pending.nil?

    token = GithubApiClient.exchange_code_for_token(
      code:          code,
      client_id:     GithubOauth.client_id,
      client_secret: GithubOauth.client_secret,
      redirect_uri:  github_callback_url,
    )
    user = GithubApiClient.fetch_user(access_token: token)

    dev_pubkey_b64 = pending["dev_pubkey"].sub(/\Aed25519-pub:/, "")
    attested_at    = Time.current
    signer         = PlatformKeySigner.from_env

    payload = Attestation.build_payload(
      dev_pubkey_b64:  dev_pubkey_b64,
      github_user_id:  user.fetch("id"),
      github_login:    user.fetch("login"),
      platform_key_id: signer.key_id,
      attested_at:     attested_at,
    )
    canonical, signature_b64 = signer.sign(payload)

    attestation = Attestation.create!(
      dev_pubkey_b64:         dev_pubkey_b64,
      dev_pubkey_fingerprint: Attestation.fingerprint(dev_pubkey_b64),
      github_user_id:         user.fetch("id"),
      github_login:           user.fetch("login"),
      platform_key_id:        signer.key_id,
      signed_payload_json:    canonical,
      signature_b64:          signature_b64,
      attested_at:            attested_at,
    )

    claim_code = SecureRandom.urlsafe_base64(32)
    OauthStateStore.new.put_claim(claim_code, attestation.to_attestation_json)

    redirect_to build_cli_callback_url(pending["cli_port"], pending["cli_state"], claim_code),
                allow_other_host: true
  rescue GithubApiClient::OAuthError => e
    oauth_error(:bad_gateway, "GitHub error: #{e.message}")
  end

  private

  def github_callback_url
    "#{request.protocol}#{request.host_with_port}/api/auth/github/callback"
  end

  def build_cli_callback_url(cli_port, cli_state, claim_code)
    query = URI.encode_www_form(cli_state: cli_state, claim_code: claim_code)
    "http://localhost:#{cli_port}/callback?#{query}"
  end

  def oauth_error(status, message)
    render plain: "OAuth error: #{message}", status: status
  end
end
