# Removes the synthetic v0.3.2 CliDoc inserted by seed_fixture_version.rb.

VERSION = "0.3.2"
count = CliDoc.where(version: VERSION).destroy_all.size
puts "[e2e fixture] removed #{count} row(s) for v#{VERSION}"
