# Per-signal priority ordering for the matching score formula.
#
# `ranking` (1..4) drives the canonical weight from the spec:
#   1 → 0.40   ·   2 → 0.30   ·   3 → 0.20   ·   4 → 0.10
#
# Spec uses `ranking` (not `position`) explicitly to avoid the Rails-magic
# clash with acts_as_list / association ordering.
#
# We store both `ranking` and the derived `weight` so the matching engine
# can join + compute the final score without re-deriving on every read.

class CreatePositionPriorities < ActiveRecord::Migration[7.2]
  def change
    create_table :position_priorities do |t|
      t.references :position, null: false, foreign_key: true
      t.string  :signal,  null: false
      t.integer :ranking, null: false
      t.decimal :weight,  null: false, precision: 4, scale: 2   # 0.40, 0.30…
      t.timestamps
    end

    add_index :position_priorities, %i[position_id signal],  unique: true
    add_index :position_priorities, %i[position_id ranking], unique: true
  end
end
