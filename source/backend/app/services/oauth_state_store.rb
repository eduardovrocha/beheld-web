# Redis-backed single-use state store for the attestation OAuth flow
# (Phase 5 / F5.6.1).
#
# Two value families live here:
#   "oauth:pending:<gh_state>"    GitHub-side state for an in-flight authorize
#   "attestation:claim:<code>"    one-shot claim code for completed attestations
#
# Both are atomically read-and-deleted via GETDEL (Redis 6.2+), so a value
# can be redeemed exactly once.

require "json"
require "redis"

class OauthStateStore
  PENDING_PREFIX = "oauth:pending:".freeze
  CLAIM_PREFIX   = "attestation:claim:".freeze

  DEFAULT_PENDING_TTL = 10 * 60   # 10 minutes — covers the user clicking through GitHub
  DEFAULT_CLAIM_TTL   = 5 * 60    # 5 minutes — covers the redirect + CLI fetch

  def initialize(redis: default_redis)
    @redis = redis
  end

  def put_pending(state, data_hash, ttl_seconds: DEFAULT_PENDING_TTL)
    @redis.set(PENDING_PREFIX + state, JSON.generate(data_hash), ex: ttl_seconds)
  end

  def take_pending(state)
    raw = @redis.call("GETDEL", PENDING_PREFIX + state)
    raw && JSON.parse(raw)
  end

  def put_claim(code, attestation_hash, ttl_seconds: DEFAULT_CLAIM_TTL)
    @redis.set(CLAIM_PREFIX + code, JSON.generate(attestation_hash), ex: ttl_seconds)
  end

  def take_claim(code)
    raw = @redis.call("GETDEL", CLAIM_PREFIX + code)
    raw && JSON.parse(raw)
  end

  private

  def default_redis
    Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
  end
end
