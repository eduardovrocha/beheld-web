require "rails_helper"

RSpec.describe Message, type: :model do
  describe "#pending?" do
    it "returns true when responded_at and ignored_at are both nil" do
      msg = build(:message, responded_at: nil, ignored_at: nil)
      expect(msg.pending?).to be(true)
    end

    it "returns false when responded_at is present" do
      msg = build(:message, :responded)
      expect(msg.pending?).to be(false)
    end

    it "returns false when ignored_at is present" do
      msg = build(:message, :ignored)
      expect(msg.pending?).to be(false)
    end
  end

  describe "#responded?" do
    it "returns true when responded_at is present" do
      msg = build(:message, :responded)
      expect(msg.responded?).to be(true)
    end

    it "returns false when responded_at is nil" do
      msg = build(:message, responded_at: nil)
      expect(msg.responded?).to be(false)
    end
  end

  describe "#ignored?" do
    it "returns true when ignored_at is present" do
      msg = build(:message, :ignored)
      expect(msg.ignored?).to be(true)
    end

    it "returns false when ignored_at is nil" do
      msg = build(:message, ignored_at: nil)
      expect(msg.ignored?).to be(false)
    end
  end
end
