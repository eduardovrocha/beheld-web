/**
 * LandingTopbar — header used by the landing v5 only.
 *
 * Distinct from `SiteHeader` (which the other routes use). After the
 * shift to a 5-tab content layout, the anchor nav was retired — the
 * tablist itself handles navigation between sections. The topbar now
 * only carries:
 *   - LensMark + "beheld" wordmark (left, jumps to #top)
 *   - LocaleToggle | ThemeToggle cluster (right)
 *
 * Deep-linking to individual tabs still works via URL hash
 * (#manifesto | #daemon | #sessoes | #verificacao | #compromisso),
 * see LandingTabs.tsx.
 */
import { LensMark } from "@/components/LensMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <div className="top-controls">
        <LocaleToggle />
        <span className="top-divider" aria-hidden="true">|</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
