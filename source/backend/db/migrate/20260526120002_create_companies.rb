class CreateCompanies < ActiveRecord::Migration[7.2]
  def change
    create_table :companies do |t|
      t.string :name, null: false
      t.string :email, null: false

      t.timestamps
    end

    add_index :companies, :email, unique: true
  end
end
