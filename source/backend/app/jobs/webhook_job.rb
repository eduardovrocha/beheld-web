# Fire-and-forget outbound webhook delivery. Used by NotificationJob to
# notify devs of inbound verifications when they've configured a webhook.
#
# Failure policy: log + drop. Retries would amplify the impact of a flaky
# remote endpoint and there's no business-critical state to recover. If the
# dev cares about reliability they can subscribe via email instead.

require "net/http"
require "uri"

class WebhookJob < ApplicationJob
  queue_as :default

  TIMEOUT_SECONDS = 10

  def perform(url, payload)
    uri = URI.parse(url.to_s)
    return unless uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"]   = "application/json"
    request["X-Beheld-Event"] = "bundle_verified"
    request.body = payload.to_json

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl     = uri.scheme == "https"
    http.open_timeout = TIMEOUT_SECONDS
    http.read_timeout = TIMEOUT_SECONDS

    http.request(request)
  rescue StandardError => e
    Rails.logger.warn("WebhookJob: delivery failed for #{redact_host(url)} — #{e.class}: #{e.message}")
  end

  private

  # Don't leak the full URL into the logs — paths often carry tokens.
  def redact_host(url)
    URI.parse(url.to_s).host.to_s
  rescue URI::InvalidURIError
    "<invalid-url>"
  end
end
