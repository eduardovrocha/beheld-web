class CreateInstalls < ActiveRecord::Migration[7.2]
  def change
    # Contador de instalações cross-repo (B3H31D). Privacy invariants:
    #   - id é UUID gerado no cliente (~/.beheld/install-id), nunca um sequencial
    #   - os é "macos" ou "linux"; outros não são suportados
    #   - version é semver do beheld instalado
    #   - NENHUM outro campo. Sem IP, sem hostname, sem user-agent, sem
    #     fingerprint. A list é cláusula pétrea — qualquer expansão precisa
    #     bumpar o disclosure em /compromisso e o exemplo do payload na CLI.
    create_table :installs, id: :uuid do |t|
      t.string :os,      null: false
      t.string :version, null: false
      t.timestamps
    end
  end
end
