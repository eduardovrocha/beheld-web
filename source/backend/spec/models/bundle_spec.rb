require "rails_helper"

RSpec.describe Bundle, type: :model do
  describe "validations" do
    it "requires url_slug" do
      bundle = build(:bundle, url_slug: nil)
      expect(bundle).not_to be_valid
      expect(bundle.errors[:url_slug]).to include("can't be blank")
    end

    it "enforces url_slug uniqueness" do
      existing = create(:bundle)
      dup = build(:bundle, url_slug: existing.url_slug)
      expect(dup).not_to be_valid
      expect(dup.errors[:url_slug]).to include("has already been taken")
    end

    it "requires bundle_data" do
      bundle = build(:bundle, bundle_data: nil)
      expect(bundle).not_to be_valid
      expect(bundle.errors[:bundle_data]).to include("can't be blank")
    end
  end

  describe "#status" do
    it "returns :verified when last_bundle_at is within 30 days" do
      bundle = build(:bundle, last_bundle_at: 1.day.ago, revoked_at: nil)
      expect(bundle.status).to eq(:verified)
    end

    it "returns :outdated when last_bundle_at is older than 30 days" do
      bundle = build(:bundle, last_bundle_at: 31.days.ago, revoked_at: nil)
      expect(bundle.status).to eq(:outdated)
    end

    it "returns :revoked when revoked_at is present, regardless of last_bundle_at" do
      fresh_revoked = build(:bundle, last_bundle_at: 1.day.ago,  revoked_at: 1.hour.ago)
      stale_revoked = build(:bundle, last_bundle_at: 90.days.ago, revoked_at: 1.hour.ago)
      expect(fresh_revoked.status).to eq(:revoked)
      expect(stale_revoked.status).to eq(:revoked)
    end
  end

  describe "scope .active" do
    it "excludes revoked bundles" do
      live    = create(:bundle)
      revoked = create(:bundle, :revoked)

      expect(Bundle.active).to     include(live)
      expect(Bundle.active).not_to include(revoked)
    end
  end
end
