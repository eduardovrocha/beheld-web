class AddReplyBodyToMessages < ActiveRecord::Migration[7.2]
  # Texto curto da resposta do dev (F_REPLY, escopo "resposta única"). Fica
  # ao lado de responded_at — preenchido quando o dev responde com texto.
  def change
    add_column :messages, :reply_body, :text
  end
end
