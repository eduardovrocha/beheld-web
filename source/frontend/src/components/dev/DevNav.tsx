/**
 * Inline navigation chip rendered in the hero do /dashboard do dev. Espelha
 * o CompanyNav (Dashboard | Directory) — mesma família tipográfica, ícones
 * mini, item ativo em accent. Linka pro perfil público (`/v/<slug>`) quando
 * o dev tem bundle publicado.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useT } from "@/i18n/I18nProvider";

type Current = "dashboard" | "profile";

export function DevNav({ current, slug, bare = false }: {
  current?: Current;
  slug?: string | null;
  bare?: boolean;
}) {
  const t = useT();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
      {!bare && <span aria-hidden="true" style={{ color: "var(--rule)" }}>·</span>}
      <NavLink to="/dashboard" active={current === "dashboard"}>
        <DashboardIcon /> {t("dev.nav.dashboard")}
      </NavLink>
      {slug && (
        <>
          <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
          <NavLink to={`/v/${slug}`} active={current === "profile"} target="_blank">
            <ProfileIcon /> {t("dev.nav.profile")}
          </NavLink>
        </>
      )}
    </span>
  );
}

function NavLink({ to, active, target, children }: {
  to: string; active: boolean; target?: string; children: ReactNode;
}) {
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
          target={target}
          rel={target === "_blank" ? "noreferrer" : undefined}
          style={{ ...base, color: "var(--muted)", textDecoration: "none" }}>
      {children}
    </Link>
  );
}

// Four-square grid — espelha o DashboardIcon do CompanyNav (mesma motivo visual).
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

// Lente em miniatura — eco do mascote B3, reforça que 'perfil' é a face pública.
function ProfileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <circle cx="5.5" cy="5.5" r="2.2" stroke="currentColor" />
      <circle cx="5.5" cy="5.5" r="0.9" fill="currentColor" />
      <line x1="0.5" y1="5.5" x2="2.7" y2="5.5" stroke="currentColor" />
      <line x1="8.3" y1="5.5" x2="10.5" y2="5.5" stroke="currentColor" />
    </svg>
  );
}
