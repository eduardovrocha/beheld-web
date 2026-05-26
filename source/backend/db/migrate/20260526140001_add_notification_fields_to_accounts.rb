class AddNotificationFieldsToAccounts < ActiveRecord::Migration[7.2]
  def change
    # Dashboard "Configurações" surface: where to send watch notifications.
    # Both are optional — `watch=true` alone with no destination falls back
    # to the dashboard inbox.
    add_column :accounts, :notification_email,   :string
    add_column :accounts, :notification_webhook, :string
  end
end
