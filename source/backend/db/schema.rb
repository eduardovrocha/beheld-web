# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_05_26_220000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "accounts", force: :cascade do |t|
    t.string "fingerprint", null: false
    t.bigint "attestation_id"
    t.string "email_recovery"
    t.string "email_contact"
    t.string "phone_contact"
    t.boolean "directory", default: false, null: false
    t.boolean "watch", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "notification_email"
    t.string "notification_webhook"
    t.index ["attestation_id"], name: "index_accounts_on_attestation_id"
    t.index ["fingerprint"], name: "index_accounts_on_fingerprint", unique: true
  end

  create_table "attestations", force: :cascade do |t|
    t.string "dev_pubkey_b64", null: false
    t.string "dev_pubkey_fingerprint", null: false
    t.bigint "github_user_id", null: false
    t.string "github_login", null: false
    t.string "platform_key_id", null: false
    t.text "signed_payload_json", null: false
    t.string "signature_b64", null: false
    t.datetime "attested_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "revoked_at"
    t.index ["dev_pubkey_fingerprint"], name: "index_attestations_on_dev_pubkey_fingerprint"
    t.index ["github_user_id"], name: "index_attestations_on_github_user_id"
    t.index ["platform_key_id"], name: "index_attestations_on_platform_key_id"
    t.index ["revoked_at"], name: "index_attestations_on_revoked_at"
  end

  create_table "auth_challenges", force: :cascade do |t|
    t.string "nonce", null: false
    t.string "fingerprint", null: false
    t.datetime "expires_at", null: false
    t.datetime "used_at"
    t.datetime "created_at", null: false
    t.index ["expires_at"], name: "index_auth_challenges_on_expires_at"
    t.index ["fingerprint"], name: "index_auth_challenges_on_fingerprint"
    t.index ["nonce"], name: "index_auth_challenges_on_nonce", unique: true
  end

  create_table "bundles", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "url_slug", null: false
    t.datetime "published_at", null: false
    t.datetime "last_bundle_at", null: false
    t.datetime "revoked_at"
    t.jsonb "bundle_data", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "visible", default: true, null: false
    t.index ["account_id"], name: "index_bundles_on_account_id"
    t.index ["last_bundle_at"], name: "index_bundles_on_last_bundle_at"
    t.index ["url_slug"], name: "index_bundles_on_url_slug", unique: true
  end

  create_table "companies", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_companies_on_email", unique: true
  end

  create_table "dev_sessions", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "token", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index ["account_id"], name: "index_dev_sessions_on_account_id"
    t.index ["expires_at"], name: "index_dev_sessions_on_expires_at"
    t.index ["token"], name: "index_dev_sessions_on_token", unique: true
  end

  create_table "magic_links", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.string "token", null: false
    t.datetime "expires_at", null: false
    t.datetime "used_at"
    t.datetime "created_at", null: false
    t.index ["company_id"], name: "index_magic_links_on_company_id"
    t.index ["expires_at"], name: "index_magic_links_on_expires_at"
    t.index ["token"], name: "index_magic_links_on_token", unique: true
  end

  create_table "messages", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.bigint "account_id", null: false
    t.string "job_title"
    t.text "body", null: false
    t.datetime "sent_at", null: false
    t.datetime "responded_at"
    t.datetime "ignored_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_messages_on_account_id"
    t.index ["company_id"], name: "index_messages_on_company_id"
    t.index ["sent_at"], name: "index_messages_on_sent_at"
  end

  create_table "saved_devs", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.bigint "account_id", null: false
    t.text "note"
    t.datetime "saved_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_saved_devs_on_account_id"
    t.index ["company_id", "account_id"], name: "index_saved_devs_on_company_id_and_account_id", unique: true
    t.index ["company_id"], name: "index_saved_devs_on_company_id"
  end

  create_table "snapshots", force: :cascade do |t|
    t.string "short_id", null: false
    t.string "bundle_hash", null: false
    t.string "public_key", null: false
    t.jsonb "payload", null: false
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "schema_version", default: "v1", null: false
    t.index ["bundle_hash"], name: "index_snapshots_on_bundle_hash", unique: true
    t.index ["expires_at"], name: "index_snapshots_on_expires_at"
    t.index ["short_id"], name: "index_snapshots_on_short_id", unique: true
  end

  create_table "verifications", force: :cascade do |t|
    t.bigint "bundle_id", null: false
    t.bigint "company_id"
    t.string "job_title"
    t.string "area"
    t.datetime "verified_at", null: false
    t.index ["bundle_id"], name: "index_verifications_on_bundle_id"
    t.index ["company_id"], name: "index_verifications_on_company_id"
    t.index ["verified_at"], name: "index_verifications_on_verified_at"
  end

  add_foreign_key "accounts", "attestations"
  add_foreign_key "bundles", "accounts"
  add_foreign_key "dev_sessions", "accounts"
  add_foreign_key "magic_links", "companies"
  add_foreign_key "messages", "accounts"
  add_foreign_key "messages", "companies"
  add_foreign_key "saved_devs", "accounts"
  add_foreign_key "saved_devs", "companies"
  add_foreign_key "verifications", "bundles"
  add_foreign_key "verifications", "companies"
end
