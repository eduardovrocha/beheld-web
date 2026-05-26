FactoryBot.define do
  factory :magic_link do
    company
    token      { SecureRandom.urlsafe_base64(24) }
    expires_at { 15.minutes.from_now }
    created_at { Time.current }

    trait :expired do
      expires_at { 1.minute.ago }
    end

    trait :used do
      used_at { 1.minute.ago }
    end
  end
end
