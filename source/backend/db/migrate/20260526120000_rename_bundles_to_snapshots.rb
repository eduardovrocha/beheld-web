class RenameBundlesToSnapshots < ActiveRecord::Migration[7.2]
  def change
    rename_table :bundles, :snapshots
  end
end
