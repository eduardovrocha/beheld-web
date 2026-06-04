/**
 * LandingTopbar — header used by the landing v5 only.
 *
 * Separate from `SiteHeader` (which other routes use) so we can ship
 * the mockup's anchor-nav and 38px sun/moon toggle without affecting
 * MeetB3, HowItWorks, Compromisso or RealSessions.
 *
 * Layout:
 *   LensMark + "beheld"   …   nav (anchors)   …   ThemeToggle
 *
 * The nav collapses below 860px (CSS-only via `.top nav` media query
 * in index.css). The ThemeToggle stays visible at all widths.
 *
 * Labels come from i18n. The "beheld" wordmark stays untranslated
 * (brand).
 */
import { LensMark } from "@/components/LensMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

type NavLink = { href: string; key: TKey };

// Each entry maps to either a tab hash (LandingTabs listens for
// `hashchange` and activates the matching panel), or to a regular
// in-page anchor for the hero (`#top`) / CTA (`#cta`).
const NAV: NavLink[] = [
  { href: "#top", key: "landing.nav.home" },
  { href: "#manifesto", key: "landing.nav.b3" },
  { href: "#daemon", key: "landing.nav.daemon" },
  { href: "#sessoes", key: "landing.nav.sessions" },
  { href: "#verificacao", key: "landing.nav.oss" },
  { href: "#cta", key: "landing.nav.commitment" },
];

export function LandingTopbar() {
  const t = useT();
  return (
    <header className="top">
      <a
        href="#top"
        className="mark"
        style={{ textDecoration: "none", color: "var(--text)" }}
      >
        <LensMark size={22} />
        <span>beheld</span>
      </a>
      <nav>
        {NAV.map((n, i) => (
          <a key={`${n.key}-${i}`} href={n.href}>
            {t(n.key)}
          </a>
        ))}
      </nav>
      <div className="top-controls">
        <LocaleToggle />
        <span className="top-divider" aria-hidden="true">|</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
