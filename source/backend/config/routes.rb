Rails.application.routes.draw do
  # Health probe (load balancers, uptime monitors)
  get "up" => "rails/health#show", as: :rails_health_check

  # Signed snapshot upload (Phase 5 / F5.4)
  # Keeps the legacy POST /bundles path for CLI retrocompat — routes to the
  # renamed SnapshotsController after the portal data model split.
  post "bundles" => "snapshots#create"

  # Public profile page (account-bound Bundle.url_slug, with legacy
  # Snapshot.short_id fallback inside the controller). The .dpbundle
  # download must come first — otherwise Rails would peel the `.dpbundle`
  # off as a format suffix and hand the request to profiles#show.
  get "v/:slug.dpbundle"   => "profiles#download", as: :download_profile, constraints: { slug: /[A-Za-z0-9_\-]+/ }, format: false
  get "v/:slug"            => "profiles#show",     as: :public_profile,   constraints: { slug: /[A-Za-z0-9_\-]+/ }

  # Auxiliary endpoints for legacy snapshot short_ids.
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

  # Searchable directory of opted-in devs — gated by CompanyAuthenticated.
  get "directory", to: "directory#index", as: :directory

  # Recruiter → dev contact form (one click below /directory).
  get  "accounts/:account_id/contact", to: "contacts#new",    as: :new_account_contact
  post "accounts/:account_id/contact", to: "contacts#create", as: :account_contact

  # Recruiter upload + browser-side Ed25519 verification (PP12).
  get  "verify", to: "verify#index",  as: :verify_bundle
  post "verify", to: "verify#create"

  # Recruiter signup + magic-link login (server-rendered).
  resources :companies, only: %i[new create]
  scope :sessions do
    scope :company do
      get    "new",    to: "sessions/company_sessions#new",     as: :new_company_session
      post   "/",      to: "sessions/company_sessions#create",  as: :company_sessions
      get    "verify", to: "sessions/company_sessions#verify",  as: :verify_company_session
      delete "/",      to: "sessions/company_sessions#destroy", as: :company_session
    end
  end

  # Server-rendered dev dashboard (DevAuthenticated). See DashboardController.
  get    "dashboard",                                to: "dashboard#index",          as: :dashboard
  patch  "dashboard/settings",                       to: "dashboard#settings"
  delete "dashboard/bundles/:id",                    to: "dashboard#revoke_bundle",  as: :dashboard_bundle
  patch  "dashboard/bundles/:id/toggle",             to: "dashboard#toggle_bundle",  as: :toggle_dashboard_bundle
  post   "dashboard/messages/:id/respond",           to: "dashboard#respond_message", as: :respond_dashboard_message
  post   "dashboard/messages/:id/ignore",            to: "dashboard#ignore_message",  as: :ignore_dashboard_message

  # Dev auth — challenge/response with the account's Ed25519 keypair.
  namespace :api do
    namespace :v1 do
      post   "auth/challenge", to: "auth#challenge"
      post   "auth/verify",    to: "auth#verify"
      delete "auth/session",   to: "auth#destroy"

      # Bundle publishing (`beheld --share`). Signature-verified upload.
      post "bundles", to: "bundles#create"

      # Recruiter signup, consumed by the SPA at :5173/companies/new.
      post "companies", to: "companies#create"

      # SPA-side magic-link flow. Server-rendered counterparts at
      # /sessions/company/{new,verify} still exist for fallback / email
      # clients that can't run JS — same cookie set by both paths.
      post   "sessions/company/request", to: "sessions#request_company_link"
      post   "sessions/company/verify",  to: "sessions#verify_company"
      delete "sessions/company",         to: "sessions#destroy_company"

      # SPA dashboard JSON API — same data the server-rendered HTML
      # dashboard exposes, shaped for the React SPA at :5173/dashboard.
      get    "dashboard",                          to: "dashboard#index"
      patch  "dashboard/settings",                 to: "dashboard#update_settings"
      delete "dashboard/bundles/:id",              to: "dashboard#revoke_bundle"
      patch  "dashboard/bundles/:id/toggle",       to: "dashboard#toggle_bundle"
      post   "dashboard/messages/:id/respond",     to: "dashboard#respond_message"
      post   "dashboard/messages/:id/ignore",      to: "dashboard#ignore_message"

      # SPA directory at :5173/directory — same filters as the legacy
      # server-rendered DirectoryController, JSON shape.
      get "directory", to: "directory#index"

      # SPA contact form at :5173/accounts/:account_id/contact.
      get  "accounts/:account_id/contact", to: "contacts#show"
      post "accounts/:account_id/contact", to: "contacts#create"

      # SPA company dashboard at :5173/company/dashboard — totals, recent
      # activity, message list, saved-dev bookmarks (private).
      namespace :company do
        get "dashboard", to: "dashboard#index"
        get "messages",  to: "messages#index"
        resources :saved_devs, only: %i[index create update destroy],
                  param: :account_id
      end
    end
  end
end
