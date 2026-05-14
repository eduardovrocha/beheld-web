# Cross-origin requests from browser frontends consuming this API.
# Tighten `origins` per environment via the CORS_ORIGINS env var
# (comma-separated list; falls back to "*" for development convenience).

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*ENV.fetch("CORS_ORIGINS", "*").split(",").map(&:strip))

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ["Authorization"]
  end
end
