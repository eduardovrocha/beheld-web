# Per-signal threshold rows attached to a Position.
#
# Signal taxonomy (spec section 9):
#   ecosystems  → operator: "includes" · value: jsonb array of strings ["React", "Vue"]
#   test_ratio  → operator: "gte"      · value: jsonb numeric (0..100)
#   recency     → operator: "lte"      · value: jsonb numeric (days since last bundle)
#
# `value` is jsonb so it accommodates both shapes (array vs number) without
# bloating the row with nullable typed columns. The model layer normalizes
# on read.

class CreatePositionThresholds < ActiveRecord::Migration[7.2]
  def change
    create_table :position_thresholds do |t|
      t.references :position, null: false, foreign_key: true
      t.string :signal,   null: false
      t.string :operator, null: false
      t.jsonb  :value,    null: false, default: {}
      t.timestamps
    end

    # One threshold per signal per position. Recruiters can't define two
    # ecosystems thresholds — they'd contradict each other.
    add_index :position_thresholds, %i[position_id signal], unique: true
  end
end
