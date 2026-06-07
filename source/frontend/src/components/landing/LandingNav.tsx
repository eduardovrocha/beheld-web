/**
 * LandingNav — sticky top nav of landing v2.
 *
 *   left:   brand lockup (held-cursor glyph 24px + wordmark 20px) → #top
 *   center: anchor links (Manifesto · B3H31D · Sessões reais ·
 *           Verificação), hidden under 760px
 *   right:  ShellThemeToggle + LocaleToggle + "forever free for developers"
 *
 * Temas: dark é o default; o claro é opt-in via o mesmo sistema dos
 * dashboards (ShellThemeToggle → html[data-theme-v2="light"] +
 * localStorage["beheld:theme"], pré-paint no index.html). O toggle fica
 * entre os links e o badge; some o label (só ícone) abaixo de 560px pra
 * não apertar o lockup. O LocaleToggle pega a paleta v2 pelos aliases
 * --accent/--muted/--rule em landing-v2.css.
 */
import { ShellThemeToggle } from "@/components/app/ShellThemeToggle";
import { BrandGlyph, Wordmark } from "@/components/landing/BrandMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useT } from "@/i18n/I18nProvider";

export function LandingNav() {
  const t = useT();
  return (
    <nav className="nav">
      <div className="wrap nav__in">
        <a className="nav__brand" href="#top">
          <span className="nav__glyph">
            <BrandGlyph size={24} />
          </span>
          <Wordmark />
        </a>
        <div className="nav__links">
          <a href="#manifesto">{t("landing.nav.manifesto")}</a>
          <a href="#B3H31D">{t("landing.nav.b3h31d")}</a>
          <a href="#sessoes">{t("landing.nav.sessions")}</a>
          <a href="#verificacao">{t("landing.nav.verification")}</a>
          {/* entry point do cadastro de empresa (design_handoff_cadastro_empresa).
              <a> plano de propósito: a LandingNav renderiza fora de contexto de
              Router em testes, e a troca landing → shell de cadastro funciona
              bem como navegação plena. */}
          <a href="/empresa/cadastro">{t("landing.nav.companies")}</a>
        </div>
        <div className="nav__right">
          <ShellThemeToggle />
          <LocaleToggle />
          <span className="nav__free">{t("landing.nav.free")}</span>
        </div>
      </div>
    </nav>
  );
}
