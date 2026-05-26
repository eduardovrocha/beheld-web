class CreateAccounts < ActiveRecord::Migration[7.2]
  def change
    create_table :accounts do |t|
      # Ed25519 public-key fingerprint (hex). Stable identifier of the dev
      # across snapshots — same key, same account.
      t.string :fingerprint, null: false

      # Identity attestation that bound this fingerprint to a GitHub login
      # (one-to-one with `attestations`). Nullable on creation so an account
      # can exist before the GitHub OAuth flow completes.
      t.references :attestation, foreign_key: true

      # Account-recovery email. Used to send magic-link recovery codes when
      # the dev loses their private key.
      t.string :email_recovery

      # Public-facing contact details — only revealed to a company after the
      # dev clicks "Responder" on an inbound message.
      t.string :email_contact
      t.string :phone_contact

      # Whether the account is listed in the searchable company directory.
      t.boolean :directory, null: false, default: false

      # Whether the account opted in to "watch" notifications (digest emails
      # about profile views, contact attempts, etc.).
      t.boolean :watch, null: false, default: false

      t.timestamps
    end

    add_index :accounts, :fingerprint, unique: true
  end
end
