FactoryBot.define do
  factory :saved_dev do
    company
    account
    note     { nil }
    saved_at { Time.current }
  end
end
