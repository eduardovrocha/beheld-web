class Company < ApplicationRecord
  has_many :magic_links,   dependent: :destroy
  has_many :messages,      dependent: :restrict_with_exception
  has_many :verifications, dependent: :nullify
  has_many :saved_devs,    dependent: :destroy
  has_many :positions,     dependent: :destroy

  validates :name,  presence: true
  validates :email, presence: true, uniqueness: true
end
