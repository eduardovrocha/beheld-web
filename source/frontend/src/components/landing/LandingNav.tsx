/**
 * LandingNav — sticky top nav of landing v2.
 *
 *   left:   brand lockup (held-cursor glyph 24px + wordmark 20px) → #top
 *   center: anchor links (Manifesto · Daemon · Sessões reais ·
 *           Verificação), hidden under 760px
 *   right:  LocaleToggle + "forever free for developers"
 *
 * The landing is dark-only by design, so there is no ThemeToggle here —
 * only the locale switcher (it picks up the v2 palette through the
 * --accent/--muted/--rule aliases in landing-v2.css).
 */
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
          <a href="#daemon">{t("landing.nav.daemon")}</a>
          <a href="#sessoes">{t("landing.nav.sessions")}</a>
          <a href="#verificacao">{t("landing.nav.verification")}</a>
        </div>
        <div className="nav__right">
          <LocaleToggle />
          <span className="nav__free">{t("landing.nav.free")}</span>
        </div>
      </div>
    </nav>
  );
}
