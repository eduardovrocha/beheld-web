# Phase 6 / F6.8 retrocompat — distinguishes v1 bundles (legacy `signals`)
# from v2 bundles (separate `l1` + `l2`) without re-parsing the payload on
# every request. Existing rows are backfilled inline so the column is never
# null after this migration runs.

class AddSchemaVersionToBundles < ActiveRecord::Migration[7.2]
  def up
    add_column :bundles, :schema_version, :string, null: false, default: "v1"

    # Backfill v2 rows for bundles that already carry l1/l2.
    Bundle.reset_column_information
    Bundle.find_each do |b|
      inner = b.payload.is_a?(Hash) ? (b.payload["payload"] || b.payload) : {}
      detected =
        if inner.is_a?(Hash) && inner["l1"].is_a?(Hash) && inner["l2"].is_a?(Hash)
          "v2"
        elsif inner.is_a?(Hash) && inner["signals"].is_a?(Hash)
          "v1"
        else
          "unknown"
        end
      b.update_columns(schema_version: detected) unless b.schema_version == detected
    end
  end

  def down
    remove_column :bundles, :schema_version
  end
end
