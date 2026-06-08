# Inserts a synthetic v0.3.2 CliDoc row used only by Playwright E2E tests
# in the dashboard. Idempotent. Removed afterwards by teardown_fixture_version.rb.

require "digest"

VERSION  = "0.3.2"
COMMIT   = "a91f0c1"
DATE     = Time.utc(2026, 5, 4)
MARKDOWN = <<~MD
  # Beheld — Referência do CLI

  > Fonte: `packages/cli/src/` (commit `#{COMMIT}` · 2026-05-04)

  ## Sumário

  Documento fixture de teste E2E.
MD

doc = CliDoc.find_or_initialize_by(version: VERSION)
doc.commit_sha   = COMMIT
doc.published_at = DATE
doc.tag          = nil
doc.markdown     = MARKDOWN
doc.checksum     = Digest::SHA256.hexdigest(MARKDOWN)
doc.save!

puts "[e2e fixture] seeded v#{VERSION}"
