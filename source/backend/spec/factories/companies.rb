FactoryBot.define do
  factory :company do
    name  { Faker::Company.unique.name }
    email { Faker::Internet.unique.email }
  end
end
