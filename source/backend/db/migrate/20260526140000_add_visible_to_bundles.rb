class AddVisibleToBundles < ActiveRecord::Migration[7.2]
  def change
    # Bundles default to visible. The dashboard can flip this to hide the
    # public profile temporarily without revoking the bundle (which is
    # destructive). Hidden bundles 404 on /v/:slug.
    add_column :bundles, :visible, :boolean, null: false, default: true
  end
end
