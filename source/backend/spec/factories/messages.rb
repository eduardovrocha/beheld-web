FactoryBot.define do
  factory :message do
    company
    account
    job_title { Faker::Job.title }
    body      { Faker::Lorem.paragraph }
    sent_at   { Time.current }

    trait :responded do
      responded_at { 1.minute.ago }
    end

    trait :ignored do
      ignored_at { 1.minute.ago }
    end
  end
end
