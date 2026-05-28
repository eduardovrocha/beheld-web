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

ActiveRecord::Schema[7.2].define(version: 2026_05_28_010000) do
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
    t.text "reply_body"
    t.index ["account_id"], name: "index_messages_on_account_id"
    t.index ["company_id"], name: "index_messages_on_company_id"
    t.index ["sent_at"], name: "index_messages_on_sent_at"
  end

  create_table "position_matches", force: :cascade do |t|
    t.bigint "position_id", null: false
    t.bigint "account_id", null: false
    t.decimal "score", precision: 5, scale: 2, null: false
    t.string "match_type", null: false
    t.string "failed_signal"
    t.datetime "calculated_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_position_matches_on_account_id"
    t.index ["position_id", "account_id"], name: "index_position_matches_on_position_id_and_account_id", unique: true
    t.index ["position_id", "match_type"], name: "index_position_matches_on_position_id_and_match_type"
    t.index ["position_id", "score"], name: "index_position_matches_on_position_id_and_score", order: { score: :desc }
    t.index ["position_id"], name: "index_position_matches_on_position_id"
  end

  create_table "position_priorities", force: :cascade do |t|
    t.bigint "position_id", null: false
    t.string "signal", null: false
    t.integer "ranking", null: false
    t.decimal "weight", precision: 4, scale: 2, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["position_id", "ranking"], name: "index_position_priorities_on_position_id_and_ranking", unique: true
    t.index ["position_id", "signal"], name: "index_position_priorities_on_position_id_and_signal", unique: true
    t.index ["position_id"], name: "index_position_priorities_on_position_id"
  end

  create_table "position_thresholds", force: :cascade do |t|
    t.bigint "position_id", null: false
    t.string "signal", null: false
    t.string "operator", null: false
    t.jsonb "value", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["position_id", "signal"], name: "index_position_thresholds_on_position_id_and_signal", unique: true
    t.index ["position_id"], name: "index_position_thresholds_on_position_id"
  end

  create_table "positions", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.string "title", null: false
    t.text "description"
    t.jsonb "location", default: {}, null: false
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "technologies", default: [], null: false
    t.jsonb "sections", default: {}, null: false
    t.string "status", default: "active", null: false
    t.datetime "activated_at"
    t.datetime "expires_at"
    t.index ["company_id", "archived_at"], name: "index_positions_on_company_id_and_archived_at"
    t.index ["company_id"], name: "index_positions_on_company_id"
    t.index ["expires_at"], name: "index_positions_on_expires_at"
    t.index ["status"], name: "index_positions_on_status"
    t.index ["technologies"], name: "index_positions_on_technologies", using: :gin
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
  add_foreign_key "position_matches", "accounts"
  add_foreign_key "position_matches", "positions"
  add_foreign_key "position_priorities", "positions"
  add_foreign_key "position_thresholds", "positions"
  add_foreign_key "positions", "companies"
  add_foreign_key "saved_devs", "accounts"
  add_foreign_key "saved_devs", "companies"
  add_foreign_key "verifications", "bundles"
  add_foreign_key "verifications", "companies"
end
