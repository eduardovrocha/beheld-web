class CreateAuthChallenges < ActiveRecord::Migration[7.2]
  def change
    create_table :auth_challenges do |t|
      # Random hex nonce the CLI must sign with the dev's private key.
      t.string :nonce, null: false

      # Fingerprint (hex) of the public key the dev is attempting to
      # authenticate as. Looked up in `accounts` at /verify time.
      t.string :fingerprint, null: false

      # 5-minute window — past this the challenge can't be redeemed.
      t.datetime :expires_at, null: false

      # Single-use marker — set when /verify accepts the signature.
      t.datetime :used_at

      # Write-once row; no updated_at.
      t.datetime :created_at, null: false
    end

    add_index :auth_challenges, :nonce, unique: true
    add_index :auth_challenges, :fingerprint
    add_index :auth_challenges, :expires_at
  end
end
