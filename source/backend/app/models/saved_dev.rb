# Private bookmark a recruiter keeps about a dev. The `note` is the only
# place in the schema that surfaces a free-text editorial opinion about a
# dev's profile — it must NEVER leak outside `/api/v1/company/saved_devs`
# (no notifications, no dev-facing endpoints, no analytics).

class SavedDev < ApplicationRecord
  belongs_to :company
  belongs_to :account

  validates :saved_at, presence: true
  validates :company_id, uniqueness: { scope: :account_id }
end
