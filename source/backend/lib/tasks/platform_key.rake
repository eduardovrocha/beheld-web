# Incident-response rake tasks for the platform signing keys
# (Phase 5 / F5.6.1).
#
# Revoking a platform key is an info.json edit: flip `revoked: true`,
# fill in `revoked_at` + `revoked_reason`, commit, deploy. From that
# moment, every attestation signed by that key reports key_status=revoked
# via the public verifier endpoint — no DB write required.
#
# These tasks support that flow by listing the impact.

namespace :platform_key do
  desc "List attestations signed under a platform key marked revoked (incident response)"
  task list_revoked_attestations: :environment do
    revoked_keys = PlatformKey.all.select { |k| k["revoked"] }

    if revoked_keys.empty?
      puts "No platform keys are currently revoked."
      next
    end

    revoked_keys.each do |key|
      attestations = Attestation.where(platform_key_id: key["key_id"]).order(:attested_at)
      puts "Platform key: #{key['key_id']}"
      puts "  Revoked at:  #{key['revoked_at']}"
      puts "  Reason:      #{key['revoked_reason']}"
      puts "  Affected attestations: #{attestations.count}"
      attestations.each do |a|
        puts format(
          "    - %-30s id=%-10s attested_at=%s fingerprint=%s",
          a.github_login, a.github_user_id, a.attested_at.iso8601,
          a.dev_pubkey_fingerprint[0, 12],
        )
      end
      puts
    end
  end
end
