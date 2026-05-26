require "rails_helper"
require "capybara/rspec"
require "canonical_json"

# Driver intencional: `rack_test` — sem JavaScript.  Valida o HTML renderizado
# e as âncoras do JS de verificação Ed25519 (data-bundle, IDs, script
# canonicalize/verify) sem realmente executá-lo. A execução real depende de
# um driver com browser (Selenium/Cuprite + Chrome no container); não
# habilitamos isso aqui por escopo. A correção do JS é coberta por leitura +
# verificação manual + paridade com bundle/canonical.ts (twin canonical JSON).

RSpec.describe "Verify page (/verify)", type: :system do
  before { driven_by(:rack_test) }

  let(:signing_key) { Ed25519::SigningKey.generate }
  let(:verify_key)  { signing_key.verify_key }
  let(:fingerprint) { verify_key.to_bytes.unpack1("H*") }
  let(:public_key_b64url) do
    [verify_key.to_bytes].pack("m0").tr("+/", "-_").delete("=")
  end
  let(:payload) do
    {
      "created_at"     => "2026-05-26T00:00:00Z",
      "beheld_version" => "0.3.2",
      "scores"         => {
        "overall" => 81, "prompt_quality" => 80, "test_maturity" => 70,
        "tech_breadth" => 90, "growth_rate" => 75,
      },
    }
  end

  def signed_bundle
    sig_hex = signing_key.sign(CanonicalJson.dump(payload).b).unpack1("H*")
    {
      "version"    => "5",
      "payload"    => payload,
      "hash"       => "sha256:" + ("a" * 64),
      "signature"  => "ed25519:#{sig_hex}",
      "public_key" => "ed25519:#{public_key_b64url}",
    }
  end

  def attach_bundle(bundle_hash)
    path = Rails.root.join("tmp", "verify-system-#{SecureRandom.hex(4)}.dpbundle")
    File.write(path, JSON.dump(bundle_hash))
    attach_file("bundle_file", path.to_s, make_visible: false)
    path
  end

  describe "GET /verify" do
    it "exibe o formulário com aceite de .dpbundle" do
      visit "/verify"
      expect(page).to have_content("Verificar bundle beheld")
      expect(page).to have_field("bundle_file", type: "file")
      expect(page).to have_button("Verificar")
    end

    it "esconde job_title/area para visitantes anônimos" do
      visit "/verify"
      expect(page).not_to have_field("job_title")
      expect(page).not_to have_field("area")
      expect(page).to have_content("verificando como visitante")
    end
  end

  describe "Upload do bundle (resultado renderizado)" do
    it "monta o page com as âncoras que o JS Ed25519 vai consumir" do
      visit "/verify"
      attach_bundle(signed_bundle)
      click_button "Verificar"

      # Status frame (server-side): badge inicial + status do bundle.
      expect(page).to have_css("#verify-status[data-bundle]")
      expect(page).to have_css("#crypto-verdict")
      expect(page).to have_content("Status da verificação")
      expect(page).to have_content("sem registro público")

      # `#verify-content` começa escondido — o JS revela só se a assinatura
      # bater. Sem driver JS, o atributo `hidden` permanece presente.
      content_section = find("#verify-content", visible: :all)
      expect(content_section[:hidden]).to be_truthy

      # Bloco de tampered também escondido por padrão (sem JS).
      tampered = find("#verify-tampered", visible: :all)
      expect(tampered[:hidden]).to be_truthy

      # O script de verificação está embutido (canonicalize + Web Crypto).
      html = page.body
      expect(html).to include("crypto.subtle.importKey")
      expect(html).to include('"Ed25519"')
      expect(html).to include("canonicalize(bundle.payload)")
    end

    it "mostra `verificado` quando o fingerprint mapeia para um Bundle ativo" do
      account = create(:account, fingerprint: fingerprint)
      create(:bundle, account: account)

      visit "/verify"
      attach_bundle(signed_bundle)
      click_button "Verificar"

      expect(page).to have_content("verificado")
      expect(page).not_to have_content("sem registro público")
    end

    it "expõe campos extras quando uma empresa está logada (cookie signed)" do
      company = create(:company)

      # Plant the signed cookie via the controller flow — drives Capybara
      # through /sessions/company/verify with a one-shot link so the cookie
      # is actually signed by the production codepath (rack_test doesn't let
      # us mint signed cookies directly).
      link = MagicLink.create!(
        company:    company,
        token:      SecureRandom.hex(32),
        expires_at: 10.minutes.from_now,
        created_at: Time.current,
      )
      visit "/sessions/company/verify?token=#{link.token}"
      # The verify action redirects to /directory (which 404s), but the
      # signed cookie is now in our jar.

      visit "/verify"
      expect(page).to have_field("job_title")
      expect(page).to have_field("area")
    end
  end

  describe "Mensagens server-side para input ruim" do
    it "renderiza erro 422 quando o arquivo não é JSON" do
      path = Rails.root.join("tmp", "junk-#{SecureRandom.hex(4)}.dpbundle")
      File.write(path, "definitely-not-json")
      visit "/verify"
      attach_file("bundle_file", path.to_s, make_visible: false)
      click_button "Verificar"

      expect(page).to have_content("não foi possível ler o bundle")
      expect(page).to have_field("bundle_file") # form re-renderized
    end
  end
end
