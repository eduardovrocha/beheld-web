# Inbound contact from a Company to an Account. The body is recruiter-written
# but the dev's response (when they click "Responder") is a fixed system
# message — see the F_REPLY spec.

class Message < ApplicationRecord
  belongs_to :company
  belongs_to :account

  validates :body, presence: true

  def responded?
    responded_at.present?
  end

  def ignored?
    ignored_at.present?
  end

  def pending?
    !responded? && !ignored?
  end
end
