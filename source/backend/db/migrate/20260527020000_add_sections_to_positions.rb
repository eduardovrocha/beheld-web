# Add structured `sections` jsonb to positions — five canonical blocks the
# recruiter fills (or imports from a .md description):
#
#   { "responsibilities": "...",
#     "technical_stack":  "...",
#     "requirements":     "...",
#     "qualifications":   "...",
#     "nice_to_have":     "..." }
#
# Keeping the legacy `description` column for backwards-compat — older rows
# still render via that field in the detail panel when `sections` is empty.

class AddSectionsToPositions < ActiveRecord::Migration[7.2]
  def change
    add_column :positions, :sections, :jsonb, default: {}, null: false
  end
end
