require "rails_helper"

RSpec.describe WebhookJob, type: :job do
  let(:url)     { "https://example.com/hook" }
  let(:payload) { { event: "bundle_verified", company: "Acme", verified_at: "2026-05-26T12:00:00Z" } }

  it "POSTs the payload as JSON with the brand event header" do
    stub = stub_request(:post, url)
             .with(
               body:    payload.to_json,
               headers: { "Content-Type" => "application/json",
                          "X-Beheld-Event" => "bundle_verified" },
             )
             .to_return(status: 200, body: "")

    described_class.perform_now(url, payload)

    expect(stub).to have_been_requested
  end

  it "swallows network errors so a flaky endpoint can't crash the worker" do
    stub_request(:post, url).to_raise(Errno::ECONNREFUSED)

    expect {
      described_class.perform_now(url, payload)
    }.not_to raise_error
  end

  it "swallows HTTP timeouts (10s read timeout)" do
    stub_request(:post, url).to_timeout

    expect {
      described_class.perform_now(url, payload)
    }.not_to raise_error
  end

  it "no-ops for non-HTTP schemes (e.g. file://, ftp://)" do
    described_class.perform_now("file:///etc/passwd", payload)
    expect(WebMock).not_to have_requested(:any, /.*/)
  end

  it "redacts the URL path from the failure log (only host appears)" do
    stub_request(:post, "https://example.com/secret-token-path").to_raise(StandardError.new("boom"))

    expect(Rails.logger).to receive(:warn) do |msg|
      expect(msg).to include("example.com")
      expect(msg).not_to include("secret-token-path")
    end

    described_class.perform_now("https://example.com/secret-token-path", payload)
  end
end
