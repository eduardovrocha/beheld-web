class CreateBundles < ActiveRecord::Migration[7.2]
  def change
    create_table :bundles do |t|
      # Each bundle belongs to a single dev account (its publisher).
      t.references :account, null: false, foreign_key: true

      # URL-safe slug exposed at /v/:url_slug — the public address of the
      # account's published profile.
      t.string :url_slug, null: false

      # When the bundle was first published.
      t.datetime :published_at, null: false

      # When the most recent re-publish happened. Used by `status` to decide
      # whether the bundle is :verified or :outdated (30-day threshold).
      t.datetime :last_bundle_at, null: false

      # Set when the dev revokes the bundle. Non-nil → status :revoked.
      t.datetime :revoked_at

      # Full payload of the .dpbundle JSON (scores + signals + L1/L2 +
      # signature + public_key). The portal does not parse this — it stores
      # the bytes for re-verification by the browser.
      t.jsonb :bundle_data, null: false

      t.timestamps
    end

    add_index :bundles, :url_slug, unique: true
    add_index :bundles, :last_bundle_at
  end
end
