# Persisted matching results — one row per (position, account) that either
# fully matched the thresholds (`match_type: "match"`) or fell exactly one
# threshold short within the 20% margin (`match_type: "near_miss"`).
#
# `failed_signal` is only populated for near-miss rows so the UI can render
# "falhou: test ratio (25% · exigido: 30%)" inline.
#
# This table is rewritten on every (re-)calculation. Treat rows as cache,
# not as a historical log — the matching engine truncates per position
# before inserting.

class CreatePositionMatches < ActiveRecord::Migration[7.2]
  def change
    create_table :position_matches do |t|
      t.references :position, null: false, foreign_key: true
      t.references :account,  null: false, foreign_key: true
      t.decimal :score,       null: false, precision: 5, scale: 2   # 0.00..100.00
      t.string  :match_type,  null: false                            # "match" | "near_miss"
      t.string  :failed_signal                                       # populated only on near_miss
      t.datetime :calculated_at, null: false
      t.timestamps
    end

    add_index :position_matches, %i[position_id account_id], unique: true
    add_index :position_matches, %i[position_id score],      order: { score: :desc }
    add_index :position_matches, %i[position_id match_type]
  end
end
