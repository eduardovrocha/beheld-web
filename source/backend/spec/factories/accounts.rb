FactoryBot.define do
  factory :account do
    fingerprint { SecureRandom.hex(32) }
    directory   { false }
    watch       { false }

    trait :with_contact do
      email_contact { Faker::Internet.unique.email }
      phone_contact { Faker::PhoneNumber.cell_phone }
    end

    trait :in_directory do
      directory { true }
    end
  end
end
