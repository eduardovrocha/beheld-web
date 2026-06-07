/**
 * Chrome — Nav + Footer da landing.
 *
 * Nav segue o padrão da LandingNav legada: brand lockup (BrandGlyph +
 * Wordmark) → #top, âncoras centrais, e à direita ShellThemeToggle +
 * LocaleToggle + badge "forever free". O link de cadastro de empresa é
 * um <a> plano de propósito (a landing renderiza fora de contexto de
 * Router em testes; a troca landing → shell funciona como navegação
 * plena).
 */
import { LocaleToggle } from "@/components/LocaleToggle";
import { ShellThemeToggle } from "@/components/app/ShellThemeToggle";
import { BrandGlyph, Wordmark } from "@/components/landing/BrandMark";

import { useT } from "../T";

export function Nav() {
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
          <a href="#manifesto">{t("nav.links.manifesto")}</a>
          <a href="#B3H31D">{t("nav.links.B3H31D")}</a>
          <a href="#sessoes">{t("nav.links.sessions")}</a>
          <a href="#verificacao">{t("nav.links.verification")}</a>
          <a href="/empresa/cadastro">{t("nav.links.companies")}</a>
        </div>
        <div className="nav__right">
          <ShellThemeToggle />
          <LocaleToggle />
          <span className="nav__free">{t("nav.free")}</span>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="site-foot">
      <div className="wrap site-foot__grid">
        <div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <BrandGlyph size={22} />
            <span className="lk-word" style={{ fontSize: 22 }}>
              <span className="b">b</span>eheld
            </span>
          </span>
          <p className="fm fm--tag" style={{ margin: "14px 0 0" }}>{t("footer.tagline")}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="fm" style={{ margin: 0 }}>
            {t("footer.contact")}
            <a href="#">{t("footer.links.github")}</a>
            <a href="#">{t("footer.links.docs")}</a>
            <a href="#manifesto">{t("footer.links.manifesto")}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
