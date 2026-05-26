require "rails_helper"

RSpec.describe Account, type: :model do
  describe "validations" do
    it "requires a fingerprint" do
      account = build(:account, fingerprint: nil)
      expect(account).not_to be_valid
      expect(account.errors[:fingerprint]).to include("can't be blank")
    end

    it "enforces fingerprint uniqueness" do
      existing = create(:account)
      dup = build(:account, fingerprint: existing.fingerprint)
      expect(dup).not_to be_valid
      expect(dup.errors[:fingerprint]).to include("has already been taken")
    end
  end

  describe "#contact_configured?" do
    it "returns false when email_contact is blank" do
      account = build(:account, email_contact: nil, phone_contact: "+5511999990000")
      expect(account.contact_configured?).to be(false)
    end

    it "returns false when phone_contact is blank" do
      account = build(:account, email_contact: "dev@example.com", phone_contact: nil)
      expect(account.contact_configured?).to be(false)
    end

    it "returns true when both email_contact and phone_contact are present" do
      account = build(:account, email_contact: "dev@example.com", phone_contact: "+5511999990000")
      expect(account.contact_configured?).to be(true)
    end
  end
end
