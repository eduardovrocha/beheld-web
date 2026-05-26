FactoryBot.define do
  factory :bundle do
    account
    sequence(:url_slug) { |n| "slug-#{n}-#{SecureRandom.hex(4)}" }
    published_at        { 1.day.ago }
    last_bundle_at      { 1.day.ago }
    bundle_data         { { "version" => "1", "payload" => { "scores" => { "overall" => 75 } } } }

    trait :revoked do
      revoked_at { 1.hour.ago }
    end

    trait :outdated do
      last_bundle_at { 31.days.ago }
    end
  end
end
