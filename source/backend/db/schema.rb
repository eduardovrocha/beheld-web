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

ActiveRecord::Schema[7.2].define(version: 2026_05_14_150000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "bundles", force: :cascade do |t|
    t.string "short_id", null: false
    t.string "bundle_hash", null: false
    t.string "public_key", null: false
    t.jsonb "payload", null: false
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "schema_version", default: "v1", null: false
    t.index ["bundle_hash"], name: "index_bundles_on_bundle_hash", unique: true
    t.index ["expires_at"], name: "index_bundles_on_expires_at"
    t.index ["short_id"], name: "index_bundles_on_short_id", unique: true
  end
end
