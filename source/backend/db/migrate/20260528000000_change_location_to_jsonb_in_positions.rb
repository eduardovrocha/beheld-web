class ChangeLocationToJsonbInPositions < ActiveRecord::Migration[7.2]
  # positions.location was a free-text string. The redesigned form stores a
  # structured hierarchy (region/country/state/city) as jsonb. Existing rows
  # are preserved under a `raw` key so the UI can still display them via the
  # formatLocation fallback — no data loss, no manual backfill needed.
  def up
    execute <<-SQL
      ALTER TABLE positions
      ALTER COLUMN location TYPE jsonb
      USING CASE
        WHEN location IS NULL OR location = '' THEN '{}'::jsonb
        ELSE jsonb_build_object('raw', location)
      END
    SQL

    change_column_default :positions, :location, from: nil, to: {}
    change_column_null    :positions, :location, false, {}
  end

  def down
    change_column_null    :positions, :location, true
    change_column_default :positions, :location, from: {}, to: nil

    execute <<-SQL
      ALTER TABLE positions
      ALTER COLUMN location TYPE varchar
      USING COALESCE(location->>'city', location->>'raw', '')
    SQL
  end
end
