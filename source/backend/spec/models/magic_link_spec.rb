require "rails_helper"

RSpec.describe MagicLink, type: :model do
  describe "#usable?" do
    it "returns false when expired" do
      link = build(:magic_link, expires_at: 1.minute.ago, used_at: nil)
      expect(link.usable?).to be(false)
    end

    it "returns false when used_at is present" do
      link = build(:magic_link, expires_at: 1.hour.from_now, used_at: 1.minute.ago)
      expect(link.usable?).to be(false)
    end

    it "returns true when valid and unused" do
      link = build(:magic_link, expires_at: 1.hour.from_now, used_at: nil)
      expect(link.usable?).to be(true)
    end
  end
end
