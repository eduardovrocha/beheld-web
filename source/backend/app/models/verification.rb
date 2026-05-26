# Recruiter-side proof that a bundle was inspected. Created when a Company
# uploads a .dpbundle on /verify, or when a directory search opens it.
# Anonymous verifications (no Company logged in) leave `company_id` null.

class Verification < ApplicationRecord
  belongs_to :bundle
  belongs_to :company, optional: true

  validates :verified_at, presence: true
end
