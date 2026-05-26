class CreateSavedDevs < ActiveRecord::Migration[7.2]
  def change
    create_table :saved_devs do |t|
      # The recruiter who saved this dev.
      t.references :company, null: false, foreign_key: true

      # The dev being saved. Soft join (deleting the account doesn't cascade
      # — recruiters can keep notes about ghosts; we just hide them in the UI).
      t.references :account, null: false, foreign_key: true

      # Private to the company — never returned in any public/dev-facing
      # response. PP12 explicitly forbids leaking this anywhere outside
      # /api/v1/company/saved_devs.
      t.text :note

      # When the company first added this dev. Distinct from updated_at:
      # editing the note doesn't change saved_at.
      t.datetime :saved_at, null: false

      t.timestamps
    end

    # A company can only save the same dev once. UPSERT logic in the
    # controller relies on this.
    add_index :saved_devs, %i[company_id account_id], unique: true
  end
end
