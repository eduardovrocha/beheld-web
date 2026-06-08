# frozen_string_literal: true

require "rails_helper"
require "rake"

RSpec.describe "docs:cli:ingest", type: :task do
  let(:fixture_dir) { Rails.root.join("spec/fixtures/files/docs") }
  let(:fixture_md)  { fixture_dir.join("cli-references-v0-4-1.md").read }

  before(:all) do
    Rails.application.load_tasks if Rake::Task.tasks.empty?
  end

  before do
    Rake::Task["docs:cli:ingest"].reenable
  end

  def invoke_with_glob(glob)
    ENV["BEHELD_CLI_DOCS_GLOB"] = glob
    Rake::Task["docs:cli:ingest"].invoke
  ensure
    ENV.delete("BEHELD_CLI_DOCS_GLOB")
  end

  it "ingere v0.4.1 a partir do .md de fixture" do
    invoke_with_glob(fixture_dir.join("cli-references-v*.md").to_s)

    expect(CliDoc.count).to eq(1)
    doc = CliDoc.first
    expect(doc.version).to eq("0.4.1")
    expect(doc.commit_sha).to eq("d41f476")
    expect(doc.published_at.to_date).to eq(Date.new(2026, 6, 8))
    expect(doc.markdown).to eq(fixture_md)
    expect(doc.checksum).to eq(Digest::SHA256.hexdigest(fixture_md))
  end

  it "upsert é idempotente — rodar duas vezes não cria duplicado" do
    invoke_with_glob(fixture_dir.join("cli-references-v*.md").to_s)
    Rake::Task["docs:cli:ingest"].reenable
    invoke_with_glob(fixture_dir.join("cli-references-v*.md").to_s)

    expect(CliDoc.count).to eq(1)
  end

  it "atualiza markdown e checksum no upsert quando o .md muda" do
    invoke_with_glob(fixture_dir.join("cli-references-v*.md").to_s)
    original = CliDoc.first.checksum

    altered_md = fixture_md + "\n\n## Adendo\n"
    altered_path = fixture_dir.join("cli-references-v0-4-1-altered-test.md")
    File.write(altered_path, altered_md)

    begin
      glob = fixture_dir.join("cli-references-v0-4-1-altered-test.md").to_s
      # Renomeio só pro padrão de versão bater: o glob deve casar e o nome
      # deve produzir version="0.4.1" — usamos um glob específico
      Rake::Task["docs:cli:ingest"].reenable
      ENV["BEHELD_CLI_DOCS_GLOB"] = glob
      # O regex de extração espera v0-4-1.md no final; renomeio temporário:
      tmp = fixture_dir.join("cli-references-v0-4-1.md.bak")
      FileUtils.mv(fixture_dir.join("cli-references-v0-4-1.md"), tmp)
      altered_proper = fixture_dir.join("cli-references-v0-4-1.md")
      File.write(altered_proper, altered_md)
      ENV["BEHELD_CLI_DOCS_GLOB"] = fixture_dir.join("cli-references-v*.md").to_s

      Rake::Task["docs:cli:ingest"].invoke
      reloaded = CliDoc.first
      expect(reloaded.checksum).not_to eq(original)
      expect(reloaded.markdown).to include("Adendo")

      File.delete(altered_proper)
      FileUtils.mv(tmp, fixture_dir.join("cli-references-v0-4-1.md"))
    ensure
      File.delete(altered_path) if File.exist?(altered_path)
      ENV.delete("BEHELD_CLI_DOCS_GLOB")
    end
  end

  it "marca o doc mais recente como latest após ingestão" do
    invoke_with_glob(fixture_dir.join("cli-references-v*.md").to_s)
    expect(CliDoc.find_by(version: "0.4.1").tag).to eq("latest")
  end

  it "propaga erro do MetaExtractor quando o .md está malformado" do
    bad_path = fixture_dir.join("cli-references-v9-9-9.md")
    File.write(bad_path, "# Título sem bloco Fonte\n")

    begin
      expect {
        invoke_with_glob(fixture_dir.join("cli-references-v9*.md").to_s)
      }.to raise_error(DocsCli::MetaExtractor::MalformedError)
    ensure
      File.delete(bad_path) if File.exist?(bad_path)
    end
  end
end
