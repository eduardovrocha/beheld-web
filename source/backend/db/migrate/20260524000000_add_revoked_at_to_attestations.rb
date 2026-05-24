# F_UNINSTALL — attestation revocation via `beheld delete --remote`.
#
# Originally Phase 5 / F5.6.1 deliberately did NOT store revoked_at on
# attestations: revocation cascaded from the platform key's `revoked` flag,
# which let the operator invalidate everything ever signed with a given
# key by editing one info.json. That's still the mass-revocation path.
#
# This column adds the inverse: per-attestation, dev-initiated revocation
# (the dev signs a "revoke" payload with their own private key). Verifiers
# that already check the cascading platform_key revocation now ALSO honor
# revoked_at != nil as a denied state.

class AddRevokedAtToAttestations < ActiveRecord::Migration[7.2]
  def change
    add_column :attestations, :revoked_at, :datetime, null: true
    add_index  :attestations, :revoked_at
  end
end
