import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { useT } from "@/i18n/I18nProvider";

import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm transition-colors ${
          isActive
            ? "text-slate-900 dark:text-slate-100"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="min-h-screen">
      <header
        className="backdrop-blur"
        style={{
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div className="mx-auto flex items-center justify-between px-6 py-3" style={{ maxWidth: 860 }}>
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            <span
              className="font-mono font-bold tracking-tight"
              style={{ color: "var(--text)", fontSize: 13 }}
            >
              beheld
              <span style={{ color: "var(--accent)", fontWeight: 400 }}>.dev</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4" style={{ color: "var(--muted)" }}>
            <NavItem to="/verify">{t("nav.verify_bundle")}</NavItem>
            <a
              href="https://github.com/eduardovrocha/beheld"
              target="_blank"
              rel="noreferrer"
              className="text-sm transition-colors hover:opacity-100"
              style={{ color: "var(--muted)" }}
            >
              {t("nav.github")}
            </a>
            <LocaleToggle />
            <ThemeToggle />
          </nav>
        </div>
      </header>

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

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <rect width="32" height="32" rx="6" fill="#0f172a" stroke="#334155" />
      <path d="M8 22 L8 10 L14 10 L14 22 Z" fill="#4c1" />
      <path d="M16 22 L16 14 L22 14 L22 22 Z" fill="#97ca00" />
      <path d="M24 22 L24 18 L26 18 L26 22 Z" fill="#dfb317" />
    </svg>
  );
}
