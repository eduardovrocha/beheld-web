/**
 * Inline navigation chip rendered in the hero of every recruiter-facing
 * page (/directory + /company/dashboard). Keeps both surfaces one click
 * away from each other.
 *
 * Visual: monospace 12px, same family as the page's meta-line ("X perfis
 * ativos", "totais e taxa de resposta"). The current page is rendered as
 * accent-colored text (no link); siblings render as muted underlined
 * <Link>s. Separators (· and |) sit in var(--rule) so they don't compete
 * with the content.
 */
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { useT } from "@/i18n/I18nProvider";

type Current = "dashboard" | "directory" | "messages";

export function CompanyNav({ current, bare = false }: { current?: Current; bare?: boolean }) {
  const t = useT();
  // Wrapped in a single inline-flex unit so the pieces (Dashboard · | ·
  // Directory · | · Mensagens) never wrap apart when the parent is a
  // flex-wrap row. Keeps the nav identical across heros + a contact page.
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
      {!bare && <span aria-hidden="true" style={{ color: "var(--rule)" }}>·</span>}
      <NavLink to="/company/dashboard" active={current === "dashboard"}>
        <DashboardIcon /> {t("company.nav.dashboard")}
      </NavLink>
      <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
      <NavLink to="/directory" active={current === "directory"}>
        <DirectoryIcon /> {t("company.nav.directory")}
      </NavLink>
      <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
      <NavLink to="/company/dashboard#mensagens" active={current === "messages"}>
        <MessagesIcon /> {t("company.nav.messages")}
      </NavLink>
    </span>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  const base = {
    letterSpacing: "0.04em",
    display:       "inline-flex",
    alignItems:    "center",
    gap:           6,
  } as const;
  if (active) {
    return (
      <span style={{
        ...base,
        color:               "var(--accent)",
        fontWeight:          700,
        textDecoration:      "underline",
        textDecorationColor: "var(--accent)",
        textUnderlineOffset: 3,
      }}>
        {children}
      </span>
    );
  }
  return (
    <Link to={to}
          style={{
            ...base,
            color: "var(--muted)",
            textDecoration: "none",
          }}>
      {children}
    </Link>
  );
}

// Four-square grid — echoes the StatsGrid's 4-card layout on /company/dashboard.
function DashboardIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <rect x="0.5" y="0.5" width="4"  height="4" stroke="currentColor" />
      <rect x="6.5" y="0.5" width="4"  height="4" stroke="currentColor" />
      <rect x="0.5" y="6.5" width="4"  height="4" stroke="currentColor" />
      <rect x="6.5" y="6.5" width="4"  height="4" stroke="currentColor" />
    </svg>
  );
}

// Stacked lines — list/index motif, sized to match the dashboard icon.
function DirectoryIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <line x1="0.5" y1="1.5"  x2="10.5" y2="1.5"  stroke="currentColor" />
      <line x1="0.5" y1="5.5"  x2="10.5" y2="5.5"  stroke="currentColor" />
      <line x1="0.5" y1="9.5"  x2="10.5" y2="9.5"  stroke="currentColor" />
    </svg>
  );
}

// Envelope — mensagens, no mesmo gabarito 11×11 dos demais ícones.
function MessagesIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <rect x="0.5" y="1.5" width="10" height="8" stroke="currentColor" />
      <path d="M0.5 2 L5.5 6 L10.5 2" stroke="currentColor" />
    </svg>
  );
}
