import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";

import { Constellation } from "./Constellation";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Layout matches the beheld-landing-v4 mock:
 *   - No traditional header bar
 *   - Floating top-right controls box (lang + theme)
 *   - Main content owns its own column width / padding
 *
 * If `children` is omitted, renders <Outlet /> so it can be used as
 * a parent route element (e.g. nested under <Route element={<Layout/>}>).
 * The landing v5 (`/`) is rendered OUTSIDE this layout — it owns its
 * own Constellation, topbar and footer.
 */
export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      {/* Ambient constellation — portaled to document.body, fixed behind. */}
      <Constellation />

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

      {/* Global column constraint — all views (Home, Dashboard, /v/:slug,
          /verify) live within the same 1032px max width. Individual routes
          may still add their own inner wrapper for padding/typography
          rhythm; nesting same-width wrappers is a no-op visually. */}
      <main className="mx-auto" style={{ maxWidth: 1032 }}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
