class CreateVerifications < ActiveRecord::Migration[7.2]
  def change
    create_table :verifications do |t|
      # The bundle that was verified.
      t.references :bundle, null: false, foreign_key: true

      # Company that performed the verification. Nullable — anonymous
      # recruiters can upload a bundle to /verify without an account.
      t.references :company, foreign_key: true

      # Optional context the recruiter provided about the role they were
      # screening for. Pure metadata — never shown to the dev.
      t.string :job_title
      t.string :area

      t.datetime :verified_at, null: false
    end

    add_index :verifications, :verified_at
  end
end
