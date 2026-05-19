# GitHub OAuth credentials from the host environment (Phase 5 / F5.6.1).
#
# Two OAuth Apps exist (one per environment); the host env decides which
# client_id/client_secret pair is in scope. See documents/platform-key-ops.md
# for the credential storage policy and the bind to a developer's GitHub
# identity.

class GithubOauth
  ENV_CLIENT_ID     = "GITHUB_OAUTH_CLIENT_ID".freeze
  ENV_CLIENT_SECRET = "GITHUB_OAUTH_CLIENT_SECRET".freeze

  class MissingConfiguration < StandardError; end

  def self.client_id
    ENV[ENV_CLIENT_ID].presence or raise MissingConfiguration, "missing #{ENV_CLIENT_ID}"
  end

  def self.client_secret
    ENV[ENV_CLIENT_SECRET].presence or raise MissingConfiguration, "missing #{ENV_CLIENT_SECRET}"
  end
end
