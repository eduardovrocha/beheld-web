# frozen_string_literal: true

require "rails_helper"

RSpec.describe DocsCli::MetaExtractor do
  describe ".call" do
    let(:canonical_md) do
      <<~MD
        # Beheld — Referência do CLI

        > Fonte: `packages/cli/src/` (commit `d41f476` · 2026-06-08)
        > Documento gerado por varredura do código-fonte.

        ## Sumário
      MD
    end

    it "extrai commit_sha do blockquote canônico" do
      result = described_class.call(canonical_md)
      expect(result[:commit_sha]).to eq("d41f476")
    end

    it "extrai published_at como Date" do
      result = described_class.call(canonical_md)
      expect(result[:published_at]).to eq(Date.new(2026, 6, 8))
    end

    it "preserva commit SHAs mais longos (12 chars)" do
      md = canonical_md.sub("d41f476", "d41f476abcde")
      result = described_class.call(md)
      expect(result[:commit_sha]).to eq("d41f476abcde")
    end

    it "aceita variações de spacing no blockquote" do
      md = canonical_md.sub(
        "> Fonte: `packages/cli/src/` (commit `d41f476` · 2026-06-08)",
        "> Fonte:`packages/cli/src/`  (commit `d41f476`  ·  2026-06-08)"
      )
      result = described_class.call(md)
      expect(result[:commit_sha]).to eq("d41f476")
      expect(result[:published_at]).to eq(Date.new(2026, 6, 8))
    end

    it "levanta erro descritivo quando blockquote 'Fonte:' está ausente" do
      md = "# Título\n\n## Sumário\n"
      expect { described_class.call(md) }
        .to raise_error(DocsCli::MetaExtractor::MalformedError, /Fonte:/)
    end

    it "levanta erro descritivo quando o commit_sha está ausente" do
      md = "# Título\n\n> Fonte: `packages/cli/src/` (gerado em 2026-06-08)\n"
      expect { described_class.call(md) }
        .to raise_error(DocsCli::MetaExtractor::MalformedError, /commit/)
    end

    it "levanta erro descritivo quando a data está ausente" do
      md = "# Título\n\n> Fonte: `packages/cli/src/` (commit `d41f476`)\n"
      expect { described_class.call(md) }
        .to raise_error(DocsCli::MetaExtractor::MalformedError, /data|date/i)
    end

    it "levanta erro quando a data é inválida" do
      md = canonical_md.sub("2026-06-08", "abcd-ef-gh")
      expect { described_class.call(md) }
        .to raise_error(DocsCli::MetaExtractor::MalformedError)
    end
  end
end
