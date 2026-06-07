/**
 * Sidebar — 248px shell nav (hidden < 880px).
 *
 * Composition primitives so the company dashboard can reuse the chrome:
 *   <Sidebar>
 *     <SideSection label="dev · @dev-…" />
 *     <SideItem icon=… active badge=…>Visão geral</SideItem>
 *     …
 *     <SideFoot>…</SideFoot>
 *   </Sidebar>
 *
 * Items are <button>s when they switch in-page views (onSelect) and
 * <Link>s when they navigate (to). 14×14 line icons, currentColor.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Sidebar({ children }: { children: ReactNode }) {
  return <nav className="app__side">{children}</nav>;
}

export function SideSection({ label }: { label: string }) {
  return <p className="sec">{label}</p>;
}

export function SideItem({ icon, active = false, badge, to, href, onSelect, children }: {
  icon: ReactNode;
  active?: boolean;
  badge?: number | string | null;
  /** Internal route — renders a <Link>. */
  to?: string;
  /** External destination — renders an <a>. */
  href?: string;
  /** View switcher — renders a <button>. */
  onSelect?: () => void;
  children: ReactNode;
}) {
  const body = (
    <>
      <span className="ic" aria-hidden="true">{icon}</span>
      {children}
      {badge != null && <span className="badge">{badge}</span>}
    </>
  );
  const cls = active ? "active" : undefined;
  if (onSelect) {
    return (
      <button type="button" className={`item${active ? " active" : ""}`} onClick={onSelect}
              aria-current={active ? "page" : undefined}>
        {body}
      </button>
    );
  }
  if (to) {
    return <Link to={to} className={cls}>{body}</Link>;
  }
  return <a href={href} className={cls} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{body}</a>;
}

export function SideFoot({ children }: { children: ReactNode }) {
  return <div className="foot">{children}</div>;
}

/* ── 14×14 line icons (stroke currentColor) — per the handoff ─────────── */

export const GridIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="5.5" height="5.5" stroke="currentColor" />
    <rect x="9" y="1.5" width="5.5" height="5.5" stroke="currentColor" />
    <rect x="1.5" y="9" width="5.5" height="5.5" stroke="currentColor" />
    <rect x="9" y="9" width="5.5" height="5.5" stroke="currentColor" />
  </svg>
);

export const EnvelopeIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4l6 4 6-4M2 4v8h12V4M2 4h12" stroke="currentColor" />
  </svg>
);

export const GearIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" stroke="currentColor" />
  </svg>
);

export const DocIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 2.5h11v11h-11z" stroke="currentColor" />
    <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" />
  </svg>
);

export const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5v13M1.5 8h13" stroke="currentColor" />
  </svg>
);
