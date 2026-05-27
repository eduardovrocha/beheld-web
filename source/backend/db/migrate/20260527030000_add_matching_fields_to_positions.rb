# Extend `positions` to participate in the matching engine.
#
# Backfill mapping (preserves existing rows):
#   archived_at IS NULL      → status = "active"   + activated_at = created_at
#   archived_at IS NOT NULL  → status = "closed"   (archived_at stays as the closed_at moment)
#
# `expires_at` is left null on backfill — only newly created positions get
# the 30-day clock. Existing rows can be "reactivated" via the form, which
# will set both activated_at + expires_at.

class AddMatchingFieldsToPositions < ActiveRecord::Migration[7.2]
  def up
    add_column :positions, :status,       :string,   null: false, default: "active"
    add_column :positions, :activated_at, :datetime
    add_column :positions, :expires_at,   :datetime

    add_index :positions, :status
    add_index :positions, :expires_at

    # Backfill — preserve "archived" semantics into "closed".
    Position.reset_column_information
    Position.where.not(archived_at: nil).update_all(status: "closed")
    Position.where(archived_at: nil).update_all(
      "status = 'active', activated_at = created_at",
    )
  end

  def down
    remove_index  :positions, :expires_at
    remove_index  :positions, :status
    remove_column :positions, :expires_at
    remove_column :positions, :activated_at
    remove_column :positions, :status
  end
end
