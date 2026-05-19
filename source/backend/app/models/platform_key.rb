# Filesystem-backed registry of platform signing keys (Phase 5 / F5.6).
#
# Each key lives as TWO files in `keys/platform/`:
#   <key_id>.pub        — base64-encoded raw 32 bytes of the Ed25519 pub key
#   <key_id>.info.json  — metadata (active, revoked, timestamps)
#
# Private keys are NEVER on disk in this repo — they live only as env vars
# on the production host. See documents/platform-key-ops.md.
#
# This class is read-only: it loads keys for the `GET /api/platform-keys`
# endpoint. Generation and rotation are out-of-band operations executed by
# the platform owner.

class PlatformKey
  ALGORITHM     = "ed25519".freeze
  PUBKEY_PREFIX = "ed25519-pub:".freeze

  def self.default_root
    Rails.root.join("keys", "platform")
  end

  def self.all(root: default_root)
    root = Pathname.new(root.to_s)
    return [] unless root.directory?

    Dir.glob(root.join("*.info.json").to_s).sort.map do |info_path|
      load_one(Pathname.new(info_path))
    end
  end

  def self.load_one(info_path)
    info = JSON.parse(info_path.read)
    key_id = info.fetch("key_id")

    pub_path = info_path.dirname.join("#{key_id}.pub")
    unless pub_path.file?
      raise "platform key #{key_id}: missing pub file at #{pub_path}"
    end
    pub_b64 = pub_path.read.strip

    {
      "key_id"         => key_id,
      "algorithm"      => info.fetch("algorithm"),
      "public_key"     => "#{PUBKEY_PREFIX}#{pub_b64}",
      "active"         => info.fetch("active"),
      "revoked"        => info.fetch("revoked"),
      "created_at"     => info.fetch("created_at"),
      "rotated_at"     => info["rotated_at"],
      "revoked_at"     => info["revoked_at"],
      "revoked_reason" => info["revoked_reason"],
    }
  end
end
