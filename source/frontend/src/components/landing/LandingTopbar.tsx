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
 */
import { LensMark } from "@/components/LensMark";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavLink = { href: string; label: string };

const NAV: NavLink[] = [
  { href: "#top", label: "home" },
  { href: "#captura", label: "B3" },
  { href: "#captura", label: "daemon local" },
  { href: "#como", label: "sessões reais" },
  { href: "#nao", label: "open source" },
  { href: "#cta", label: "compromisso" },
];

export function LandingTopbar() {
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
          <a key={`${n.label}-${i}`} href={n.href}>
            {n.label}
          </a>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
