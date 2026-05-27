# Add a jsonb column of inferred technologies (e.g. ["React", "PostgreSQL",
# "Kubernetes"]) so each Position can carry the tech stack the recruiter
# wants to match against. The list is curated by the recruiter — the SPA
# extracts an initial guess from any uploaded .md description, but the
# final array is what the form posts.

class AddTechnologiesToPositions < ActiveRecord::Migration[7.2]
  def change
    add_column :positions, :technologies, :jsonb, default: [], null: false
    add_index  :positions, :technologies, using: :gin
  end
end
