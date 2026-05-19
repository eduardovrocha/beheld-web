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
end
