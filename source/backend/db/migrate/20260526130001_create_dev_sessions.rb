class CreateDevSessions < ActiveRecord::Migration[7.2]
  def change
    create_table :dev_sessions do |t|
      t.references :account, null: false, foreign_key: true

      # Opaque hex token presented by the CLI / dashboard as proof of session.
      t.string :token, null: false

      # 24-hour absolute expiry — refresh requires a new challenge cycle.
      t.datetime :expires_at, null: false

      # Write-once row; no updated_at.
      t.datetime :created_at, null: false
    end

    add_index :dev_sessions, :token, unique: true
    add_index :dev_sessions, :expires_at
  end
end
