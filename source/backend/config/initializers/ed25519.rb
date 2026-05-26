# The `ed25519` gem isn't auto-required cleanly by Zeitwerk during request
# handling in development mode (constant lookup fails inside controllers).
# Force the require at boot so `Ed25519::VerifyKey` / `Ed25519::SigningKey`
# resolve everywhere — auth controller, bundles controller, verify spec, etc.
require "ed25519"
