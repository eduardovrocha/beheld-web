import type { ReactNode } from "react";

import { useT } from "@/i18n/I18nProvider";

import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Layout matches the beheld-landing-v4 mock:
 *   - No traditional header bar
 *   - Floating top-right controls box (lang + theme)
 *   - Main content owns its own column width / padding
 */
export function Layout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="min-h-screen">
      {/* Floating controls box (top-right) */}
      <div
        className="fixed z-50 flex items-center gap-3.5"
        style={{
          top: 20,
          right: 20,
          background: "var(--bg)",
          border: "1px solid var(--rule)",
          padding: "7px 14px",
        }}
      >
        <LocaleToggle />
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10,
            color: "var(--rule)",
            userSelect: "none",
          }}
        >
          |
        </span>
        <ThemeToggle />
      </div>

      <main>{children}</main>

      <footer
        className="mt-16 py-8 text-center font-mono uppercase"
        style={{
          color: "var(--muted)",
          fontSize: 10,
          letterSpacing: "0.14em",
          borderTop: "1px solid var(--rule)",
        }}
      >
        {t("footer.tagline")}
      </footer>
    </div>
  );
}
