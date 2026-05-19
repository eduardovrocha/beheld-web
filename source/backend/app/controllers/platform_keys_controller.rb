# Platform key registry endpoint (Phase 5 / F5.6).
#
# GET /api/platform-keys
#   Returns every platform signing key (active, rotated, and revoked) so that
#   verifiers — local CLIs and the SPA — can confirm an attestation signature
#   against the right key. Rotated and revoked keys remain in the list so that
#   attestations issued under them remain verifiable; the `active` and
#   `revoked` flags tell the verifier how to treat each.
#
#   200: { keys: [<key>, ...] }
#
# See documents/platform-key-ops.md for the lifecycle of these keys.

class PlatformKeysController < ApplicationController
  def index
    render json: { keys: PlatformKey.all }
  end
end
