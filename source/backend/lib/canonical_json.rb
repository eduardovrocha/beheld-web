# Canonical JSON serialization — Ruby twin of
# `packages/cli/src/bundle/canonical.ts` and `engine/src/bundle.py`.
#
# Rules (all three implementations MUST stay byte-identical):
#   - Object keys sorted alphabetically at every depth.
#   - Compact separators (no spaces): `to_json` default behavior.
#   - UTF-8 encoding.
#
# Used to recompute the message bytes that the dev signed before we run
# Ed25519 verification against their public key.

module CanonicalJson
  module_function

  def dump(value)
    sort_deep(value).to_json
  end

  def sort_deep(value)
    case value
    when Hash
      value.keys.sort.each_with_object({}) { |k, acc| acc[k] = sort_deep(value[k]) }
    when Array
      value.map { |v| sort_deep(v) }
    else
      value
    end
  end
end
