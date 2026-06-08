# frozen_string_literal: true

# Parses the canonical "> Fonte: ... (commit `<sha>` · <yyyy-mm-dd>)" blockquote
# at the top of every cli-references-v*.md and returns its structured metadata.
#
# Falha alto se o blockquote está ausente ou malformado — protege o pipeline
# de ingestão contra documentos sem proveniência.

module DocsCli
  class MetaExtractor
    class MalformedError < StandardError; end

    FONTE_LINE = /^>\s*Fonte:.*$/
    COMMIT     = /commit\s*`([a-f0-9]{7,40})`/
    DATE       = /(\d{4}-\d{2}-\d{2})/

    def self.call(markdown)
      new(markdown).call
    end

    def initialize(markdown)
      @markdown = markdown.to_s
    end

    def call
      fonte = @markdown.lines.find { |l| l.match?(FONTE_LINE) }
      raise MalformedError, "blockquote 'Fonte:' não encontrado no documento" if fonte.nil?

      commit_match = fonte.match(COMMIT)
      raise MalformedError, "commit_sha ausente no blockquote 'Fonte:'" unless commit_match

      date_match = fonte.match(DATE)
      raise MalformedError, "data de publicação ausente no blockquote 'Fonte:'" unless date_match

      published_at =
        begin
          Date.parse(date_match[1])
        rescue ArgumentError
          raise MalformedError, "data de publicação inválida: #{date_match[1].inspect}"
        end

      {
        commit_sha: commit_match[1],
        published_at: published_at,
        extra: {}
      }
    end
  end
end
