class CreateMagicLinks < ActiveRecord::Migration[7.2]
  def change
    create_table :magic_links do |t|
      t.references :company, null: false, foreign_key: true

      # Opaque URL-safe random token — the only credential delivered by email.
      t.string :token, null: false

      t.datetime :expires_at, null: false
      t.datetime :used_at

      # No updated_at — magic links are write-once / claim-once.
      t.datetime :created_at, null: false
    end

    add_index :magic_links, :token, unique: true
    add_index :magic_links, :expires_at
  end
end
