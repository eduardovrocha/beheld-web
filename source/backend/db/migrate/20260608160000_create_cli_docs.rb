# frozen_string_literal: true

class CreateCliDocs < ActiveRecord::Migration[7.2]
  def change
    create_table :cli_docs do |t|
      t.string   :version,      null: false
      t.string   :commit_sha,   null: false
      t.datetime :published_at, null: false
      t.string   :tag
      t.text     :markdown,     null: false
      t.string   :checksum,     null: false
      t.jsonb    :meta,         null: false, default: {}
      t.timestamps
    end

    add_index :cli_docs, :version, unique: true
    add_index :cli_docs, :tag
    add_index :cli_docs, :published_at
  end
end
