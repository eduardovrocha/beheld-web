# Original `bundles` table — renamed to `snapshots` in 20260526120000 after
# the portal data-model split (a Bundle now models an account-bound profile
# publication; the raw .dpbundle is stored in `snapshots`).
class CreateBundlesLegacy < ActiveRecord::Migration[7.2]
  def change
    create_table :bundles do |t|
      t.string :short_id, null: false
      t.string :bundle_hash, null: false
      t.string :public_key, null: false
      t.jsonb  :payload, null: false
      t.datetime :expires_at

      t.timestamps
    end

    add_index :bundles, :short_id, unique: true
    add_index :bundles, :bundle_hash, unique: true
    add_index :bundles, :expires_at
  end
end
