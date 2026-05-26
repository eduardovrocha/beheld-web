class CreateMessages < ActiveRecord::Migration[7.2]
  def change
    create_table :messages do |t|
      # The company that initiated the contact and the dev account it was
      # addressed to. Email + phone of the dev are never exposed until the
      # dev clicks "Responder" — at which point a fixed body is sent back.
      t.references :company, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true

      # Role context shown to the dev so they can decide whether to respond.
      t.string :job_title

      # Free-form pitch from the recruiter. The dev sees this in their inbox.
      t.text :body, null: false

      t.datetime :sent_at, null: false

      # Mutually exclusive in practice — either the dev responded or ignored.
      t.datetime :responded_at
      t.datetime :ignored_at

      t.timestamps
    end

    add_index :messages, :sent_at
  end
end
