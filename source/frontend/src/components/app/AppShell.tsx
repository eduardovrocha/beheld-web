/**
 * AppShell — logged-in dashboard chrome (design_handoff_dev).
 *
 *   .app-v2  (grid: 248px sidebar | 1fr main; topbar spans both)
 *     <a .skip-link>
 *     <TopBar />      (sticky 56px: glyph + wordmark + crumb · authed dot)
 *     <Sidebar />     (nav sections + items + foot)
 *     <main .app__main>
 *
 * Built as a reusable primitive: the company dashboard mounts the same
 * shell with different sidebar items / crumb. While mounted, the route
 * must toggle `app-v2-page` on <html> (see Dashboard.tsx) to neutralise
 * the global theme chrome — same pattern as the landing.
 */
import type { ReactNode } from "react";

import { useT } from "@/i18n/I18nProvider";

export function AppShell({ topBar, sidebar, children }: {
  topBar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="app-v2">
      <a className="skip-link" href="#main">{t("landing.a11y.skip")}</a>
      {topBar}
      {sidebar}
      <main className="app__main" id="main">
        <div className="wrap-inner">{children}</div>
      </main>
    </div>
  );
}
