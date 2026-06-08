# frozen_string_literal: true

require "rails_helper"

RSpec.describe CliDoc, type: :model do
  def build_doc(attrs = {})
    CliDoc.new({
      version: "0.4.1",
      commit_sha: "d41f476",
      published_at: Time.utc(2026, 6, 8),
      markdown: "# CLI\n\nbody",
      checksum: "abc123"
    }.merge(attrs))
  end

  describe "validations" do
    it "exige version" do
      doc = build_doc(version: nil)
      expect(doc).not_to be_valid
      expect(doc.errors[:version]).to include("can't be blank")
    end

    it "exige commit_sha" do
      doc = build_doc(commit_sha: nil)
      expect(doc).not_to be_valid
      expect(doc.errors[:commit_sha]).to include("can't be blank")
    end

    it "exige published_at" do
      doc = build_doc(published_at: nil)
      expect(doc).not_to be_valid
      expect(doc.errors[:published_at]).to include("can't be blank")
    end

    it "exige markdown" do
      doc = build_doc(markdown: nil)
      expect(doc).not_to be_valid
      expect(doc.errors[:markdown]).to include("can't be blank")
    end

    it "exige checksum" do
      doc = build_doc(checksum: nil)
      expect(doc).not_to be_valid
      expect(doc.errors[:checksum]).to include("can't be blank")
    end

    it "exige version único" do
      build_doc.save!
      dup = build_doc
      expect(dup).not_to be_valid
      expect(dup.errors[:version]).to include("has already been taken")
    end

    it "aceita tag latest/stable/legacy" do
      %w[latest stable legacy].each do |tag|
        doc = build_doc(version: "1.0.#{rand(100)}", tag: tag)
        expect(doc).to be_valid, "tag #{tag.inspect} deveria ser válida"
      end
    end

    it "aceita tag nil" do
      doc = build_doc(tag: nil)
      expect(doc).to be_valid
    end

    it "rejeita tag fora do whitelist" do
      doc = build_doc(tag: "nightly")
      expect(doc).not_to be_valid
      expect(doc.errors[:tag]).to be_present
    end
  end

  describe "scope :ordered" do
    it "ordena por published_at desc" do
      older = CliDoc.create!(version: "0.3.0", commit_sha: "aaa1111",
                              published_at: Time.utc(2026, 1, 1),
                              markdown: "old", checksum: "h1")
      newer = CliDoc.create!(version: "0.4.1", commit_sha: "d41f476",
                              published_at: Time.utc(2026, 6, 8),
                              markdown: "new", checksum: "h2")
      expect(CliDoc.ordered.to_a).to eq([newer, older])
    end
  end

  describe "after_save: tag latest exclusivo" do
    it "ao setar tag=latest em um doc, zera o latest dos outros" do
      existing = CliDoc.create!(version: "0.4.0", commit_sha: "d7badd8",
                                 published_at: Time.utc(2026, 5, 22),
                                 markdown: "old", checksum: "h1", tag: "latest")
      newer = CliDoc.create!(version: "0.4.1", commit_sha: "d41f476",
                              published_at: Time.utc(2026, 6, 8),
                              markdown: "new", checksum: "h2", tag: "latest")
      expect(CliDoc.where(tag: "latest").pluck(:version)).to eq(["0.4.1"])
      expect(existing.reload.tag).to be_nil
      expect(newer.reload.tag).to eq("latest")
    end

    it "não altera outros quando tag != latest" do
      latest = CliDoc.create!(version: "0.4.1", commit_sha: "d41f476",
                               published_at: Time.utc(2026, 6, 8),
                               markdown: "new", checksum: "h2", tag: "latest")
      legacy = CliDoc.create!(version: "0.3.0", commit_sha: "aaa1111",
                               published_at: Time.utc(2026, 1, 1),
                               markdown: "old", checksum: "h1", tag: "legacy")
      expect(latest.reload.tag).to eq("latest")
      expect(legacy.reload.tag).to eq("legacy")
    end
  end

  describe "#to_index_entry" do
    it "retorna hash sem markdown nem checksum" do
      doc = CliDoc.create!(version: "0.4.1", commit_sha: "d41f476",
                            published_at: Time.utc(2026, 6, 8),
                            markdown: "body", checksum: "abc", tag: "latest")
      entry = doc.to_index_entry
      expect(entry.keys).to contain_exactly(:version, :commit_sha, :published_at, :tag)
      expect(entry[:version]).to eq("0.4.1")
      expect(entry[:tag]).to eq("latest")
      expect(entry).not_to have_key(:markdown)
    end
  end

  describe "#cache_etag" do
    it "deriva do checksum no formato W/\"<sha>\"" do
      doc = build_doc(checksum: "deadbeef")
      expect(doc.cache_etag).to eq('W/"deadbeef"')
    end
  end

  describe ".tag_latest_automatically!" do
    it "marca o doc mais recente como latest se nenhum tem tag" do
      older = CliDoc.create!(version: "0.3.0", commit_sha: "aaa",
                              published_at: Time.utc(2026, 1, 1),
                              markdown: "old", checksum: "h1")
      newer = CliDoc.create!(version: "0.4.1", commit_sha: "bbb",
                              published_at: Time.utc(2026, 6, 8),
                              markdown: "new", checksum: "h2")
      CliDoc.tag_latest_automatically!
      expect(newer.reload.tag).to eq("latest")
      expect(older.reload.tag).to be_nil
    end

    it "no-op quando algum já tem tag latest" do
      pinned = CliDoc.create!(version: "0.4.0", commit_sha: "aaa",
                               published_at: Time.utc(2026, 5, 22),
                               markdown: "old", checksum: "h1", tag: "latest")
      newer = CliDoc.create!(version: "0.4.1", commit_sha: "bbb",
                              published_at: Time.utc(2026, 6, 8),
                              markdown: "new", checksum: "h2")
      CliDoc.tag_latest_automatically!
      expect(pinned.reload.tag).to eq("latest")
      expect(newer.reload.tag).to be_nil
    end
  end
end
