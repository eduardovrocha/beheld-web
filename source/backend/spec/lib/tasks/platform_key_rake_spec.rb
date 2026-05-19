require "rails_helper"
require "rake"

RSpec.describe "platform_key:list_revoked_attestations rake task", type: :task do
  before(:all) do
    Rake.application.rake_require("tasks/platform_key", [Rails.root.join("lib").to_s])
    Rake::Task.define_task(:environment)
  end

  let(:task) { Rake::Task["platform_key:list_revoked_attestations"] }

  after { task.reenable }

  def stub_keys(keys)
    allow(PlatformKey).to receive(:all).and_return(keys)
  end

  def revoked_key(key_id, reason: "test reason", revoked_at: "2026-04-21T03:00:00Z")
    {
      "key_id" => key_id, "algorithm" => "ed25519",
      "public_key" => "ed25519-pub:AAAA", "active" => false, "revoked" => true,
      "created_at" => "2026-01-01T00:00:00Z", "rotated_at" => nil,
      "revoked_at" => revoked_at, "revoked_reason" => reason,
    }
  end

  def active_key(key_id)
    {
      "key_id" => key_id, "algorithm" => "ed25519",
      "public_key" => "ed25519-pub:AAAA", "active" => true, "revoked" => false,
      "created_at" => "2026-01-01T00:00:00Z", "rotated_at" => nil,
      "revoked_at" => nil, "revoked_reason" => nil,
    }
  end

  def make_attestation(platform_key_id:, github_login: "octocat", github_user_id: 12345)
    Attestation.create!(
      dev_pubkey_b64:         "ao/AsOyFTMrORd9irGlQjbxI5C7Qb4TfZVi7sgnoyio=",
      dev_pubkey_fingerprint: "f" * 64,
      github_user_id:         github_user_id,
      github_login:           github_login,
      platform_key_id:        platform_key_id,
      signed_payload_json:    '{"a":1}',
      signature_b64:          "AAAA",
      attested_at:            Time.current,
    )
  end

  it "imprime mensagem clara quando não há chaves revogadas" do
    stub_keys([active_key("k-active")])
    output = capture_stdout { task.invoke }
    expect(output).to include("No platform keys are currently revoked")
  end

  it "lista cada chave revogada com suas attestations afetadas" do
    stub_keys([revoked_key("k-revoked", reason: "exposed in CI")])
    make_attestation(platform_key_id: "k-revoked", github_login: "alice")
    make_attestation(platform_key_id: "k-revoked", github_login: "bob")

    output = capture_stdout { task.invoke }
    expect(output).to include("Platform key: k-revoked")
    expect(output).to include("exposed in CI")
    expect(output).to include("Affected attestations: 2")
    expect(output).to include("alice")
    expect(output).to include("bob")
  end

  it "ignora attestations cuja chave não está revogada" do
    stub_keys([active_key("k-active"), revoked_key("k-revoked")])
    make_attestation(platform_key_id: "k-active", github_login: "alice")
    make_attestation(platform_key_id: "k-revoked", github_login: "bob")

    output = capture_stdout { task.invoke }
    expect(output).to include("k-revoked")
    expect(output).to include("bob")
    expect(output).not_to include("k-active")
    expect(output).not_to include("alice")
  end

  def capture_stdout
    original = $stdout
    $stdout = StringIO.new
    yield
    $stdout.string
  ensure
    $stdout = original
  end
end
