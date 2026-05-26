require "rails_helper"

RSpec.describe NotificationJob, type: :job do
  include ActiveJob::TestHelper

  # ── fixtures ────────────────────────────────────────────────────────────

  def make_verification(account:, company: create(:company))
    bundle = create(:bundle, account: account)
    Verification.create!(
      bundle:      bundle,
      company:     company,
      job_title:   "Senior",
      area:        "Backend",
      verified_at: Time.current,
    )
  end

  before do
    ActionMailer::Base.deliveries.clear
    clear_enqueued_jobs
  end

  describe "guards" do
    it "no-ops when the Verification id doesn't exist" do
      expect {
        described_class.perform_now(123_456_789)
      }.not_to change(ActionMailer::Base.deliveries, :count)
      expect(enqueued_jobs.select { |j| j["job_class"] == "WebhookJob" }).to be_empty
    end

    it "no-ops when the Verification has no company (anonymous upload)" do
      account = create(:account, watch: true, notification_email: "n@example.com")
      bundle  = create(:bundle, account: account)
      v = Verification.create!(bundle: bundle, company: nil, verified_at: Time.current)

      expect { described_class.perform_now(v.id) }
        .not_to change(ActionMailer::Base.deliveries, :count)
    end

    it "no-ops when watch is false (no email, no webhook)" do
      account = create(:account,
                       watch: false,
                       notification_email:   "n@example.com",
                       notification_webhook: "https://example.com/h")
      v = make_verification(account: account)

      expect {
        perform_enqueued_jobs { described_class.perform_now(v.id) }
      }.not_to change(ActionMailer::Base.deliveries, :count)
      expect(enqueued_jobs.select { |j| j["job_class"] == "WebhookJob" }).to be_empty
    end
  end

  describe "fan-out (watch: true)" do
    it "emails when notification_email is set" do
      account = create(:account, watch: true, notification_email: "dev@example.com")
      v = make_verification(account: account)

      expect {
        perform_enqueued_jobs { described_class.perform_now(v.id) }
      }.to change(ActionMailer::Base.deliveries, :count).by(1)

      mail = ActionMailer::Base.deliveries.last
      expect(mail.to).to eq(["dev@example.com"])
      expect(mail.subject).to eq("Seu perfil foi verificado")
    end

    it "skips the email when notification_email is blank" do
      account = create(:account, watch: true, notification_email: nil,
                                 notification_webhook: "https://example.com/h")
      v = make_verification(account: account)

      expect {
        described_class.perform_now(v.id)
      }.not_to change(ActionMailer::Base.deliveries, :count)
    end

    it "enqueues a WebhookJob when notification_webhook is set" do
      account = create(:account, watch: true, notification_webhook: "https://example.com/hook")
      v = make_verification(account: account, company: create(:company, name: "Acme"))

      expect {
        described_class.perform_now(v.id)
      }.to have_enqueued_job(WebhookJob).with(
        "https://example.com/hook",
        a_hash_including(
          event:     "bundle_verified",
          company:   "Acme",
          job_title: "Senior",
          area:      "Backend",
        ),
      )
    end

    it "skips the WebhookJob when notification_webhook is blank" do
      account = create(:account, watch: true, notification_email: "dev@example.com",
                                 notification_webhook: nil)
      v = make_verification(account: account)

      expect {
        described_class.perform_now(v.id)
      }.not_to have_enqueued_job(WebhookJob)
    end
  end

  describe "enqueue from /verify" do
    it "enqueues NotificationJob with the Verification id (via verify_controller)" do
      # Smoke against the same Active Job pipeline the controller uses.
      account = create(:account)
      v = make_verification(account: account)
      expect {
        NotificationJob.perform_later(v.id)
      }.to have_enqueued_job(NotificationJob).with(v.id)
    end
  end
end
