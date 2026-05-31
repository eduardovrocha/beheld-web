# Rack::Attack — rate limit pra endpoints públicos sem autenticação.
#
# Atualmente só protege POST /api/install/register (B3H31D install counter).
# Outros endpoints públicos (count, platform-keys, badges) são GET cacheado
# server-side — load adicional não justifica complexidade.
#
# Storage: Rails.cache (qualquer adapter — memory_store em dev, redis em prod).
# Em produção com múltiplos workers, configure REDIS_URL para que o cache de
# rate limit seja compartilhado entre processos.

class Rack::Attack
  # Usar o mesmo backend cache do Rails (configurado em config/environments).
  Rack::Attack.cache.store = Rails.cache

  # POST /api/install/register: 10 por IP por hora.
  # Override via env REGISTER_RATE_LIMIT="N/period_seconds" (ex: "20/3600").
  register_limit, register_period = (ENV["INSTALL_REGISTER_RATE_LIMIT"] || "10/3600").split("/").map(&:to_i)
  throttle("install/register", limit: register_limit, period: register_period) do |req|
    req.ip if req.path == "/api/install/register" && req.post?
  end

  # Response em 429: vazio (cliente trata como sucesso silencioso por design).
  self.throttled_responder = lambda do |_env|
    [429, { "content-type" => "text/plain" }, [""]]
  end
end
