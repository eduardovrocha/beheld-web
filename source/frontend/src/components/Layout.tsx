import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

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
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-slate-50/80 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-mono text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              devprofile
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <NavItem to="/verify">Verificar bundle</NavItem>
            <a
              href="https://github.com/ioit-solutions/devprofile"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              GitHub
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>

      <footer className="mt-16 border-t border-slate-200/80 py-8 text-center text-xs text-slate-500 dark:border-slate-800/80">
        devprofile · privacy-first developer profiling · signed snapshots
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
