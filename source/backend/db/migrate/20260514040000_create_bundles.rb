class CreateBundles < ActiveRecord::Migration[7.2]
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
