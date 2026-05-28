# Inbound contact from a Company to an Account. `body` is recruiter-written;
# `reply_body` is the dev's short reply, captured when they click "Responder"
# (F_REPLY — escopo "resposta única"). Optional: `responded?` pode ser true
# com reply em branco (dev só sinalizou interesse, sem texto).

class Message < ApplicationRecord
  belongs_to :company
  belongs_to :account

  validates :body, presence: true
  validates :reply_body, length: { maximum: 2000 }, allow_blank: true

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
