# Recruiter-managed job postings. Each row is a position the company is
# actively (or once was actively) hiring for. Used by the SPA's
# `/company/dashboard` "Posições disponíveis" tab.
#
# Soft-archive via `archived_at` so historical positions can stay linked to
# Message rows (recruiter→dev conversations) without breaking referential
# integrity if a vacancy is closed.

class CreatePositions < ActiveRecord::Migration[7.2]
  def change
    create_table :positions do |t|
      t.references :company, null: false, foreign_key: true
      t.string  :title,        null: false
      t.text    :description
      t.string  :location                       # "Remoto", "São Paulo, BR", etc.
      t.datetime :archived_at                   # closed/paused vacancies
      t.timestamps
    end

    add_index :positions, %i[company_id archived_at]
  end
end
