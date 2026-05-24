Rails.application.routes.draw do
  # Health probe (load balancers, uptime monitors)
  get "up" => "rails/health#show", as: :rails_health_check

  # Signed snapshot upload (Phase 5 / F5.4)
  post "bundles" => "bundles#create"

  # Public verification — bundle delivery + badge + lightweight summary (Phase 5 / F5.5)
  get "v/:id"           => "v#show",    as: :verify,         constraints: { id: /[A-Za-z0-9_\-]+/ }
  get "v/:id/summary"   => "v#summary", as: :verify_summary, constraints: { id: /[A-Za-z0-9_\-]+/ }
  get "v/:id/badge.svg" => "v#badge",   as: :verify_badge,   constraints: { id: /[A-Za-z0-9_\-]+/ }

  # Platform key registry (Phase 5 / F5.6) — public list of signing keys used
  # for identity attestations. See documents/platform-key-ops.md.
  get "api/platform-keys" => "platform_keys#index", as: :api_platform_keys

  # GitHub OAuth flow for identity attestation (Phase 5 / F5.6.1).
  get  "api/auth/github/start"    => "auth#github_start",    as: :api_auth_github_start
  get  "api/auth/github/callback" => "auth#github_callback", as: :api_auth_github_callback

  # Attestation claim — one-shot exchange of `claim_code` for the signed
  # attestation produced inside the OAuth callback.
  post "api/attestation/claim"    => "attestations#claim",   as: :api_attestation_claim

  # Attestation verify — pure crypto + revocation-status check. No DB write.
  post "api/attestation/verify"   => "attestations#verify",  as: :api_attestation_verify

  # Attestation revoke — dev-initiated per-attestation revocation (F_UNINSTALL).
  # The dev signs {action, issued_at, timestamp} with their own Ed25519 key.
  post "api/attestation/revoke"   => "attestations#revoke",  as: :api_attestation_revoke
end
