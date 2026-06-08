# frozen_string_literal: true

# Ingestão da referência do CLI em CliDoc.
#
# Lê todo arquivo packages/cli/docs/cli-references-v<X>-<Y>-<Z>.md no glob
# default (override por BEHELD_CLI_DOCS_GLOB), extrai metadados via
# DocsCli::MetaExtractor e faz upsert por version. Ao final, marca o doc
# mais recente como "latest" (idempotente).
#
# Fonte real do .md fica em packages/cli/docs/ no monorepo `beheld`; este
# Rails roda em web/source/backend/, então o glob default sobe 3 níveis.

require "digest"

namespace :docs do
  namespace :cli do
    desc "Ingere cli-references-v*.md em CliDoc (idempotente)"
    task ingest: :environment do
      default_glob = Rails.root.join("..", "..", "..", "packages",
                                     "cli", "docs", "cli-references-v*.md").to_s
      glob = ENV.fetch("BEHELD_CLI_DOCS_GLOB", default_glob)

      paths = Dir[glob].sort
      if paths.empty?
        Rails.logger.warn "[docs:cli:ingest] nenhum arquivo casou em #{glob.inspect}"
        next
      end

      paths.each do |path|
        match = File.basename(path).match(/v(\d+)-(\d+)-(\d+)\.md\z/)
        unless match
          Rails.logger.warn "[docs:cli:ingest] ignorado (nome fora do padrão): #{path}"
          next
        end

        version = [match[1], match[2], match[3]].join(".")
        markdown = File.read(path)
        meta     = DocsCli::MetaExtractor.call(markdown)

        existing = CliDoc.find_by(version: version)
        attrs = {
          version: version,
          commit_sha: meta[:commit_sha],
          published_at: meta[:published_at],
          markdown: markdown,
          checksum: Digest::SHA256.hexdigest(markdown),
          meta: meta[:extra] || {}
        }

        if existing
          existing.update!(attrs)
        else
          CliDoc.create!(attrs)
        end

        Rails.logger.info "[docs:cli:ingest] #{version} ingerido (#{File.basename(path)})"
      end

      CliDoc.tag_latest_automatically!
    end
  end
end
