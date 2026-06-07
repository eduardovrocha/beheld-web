/**
 * TopBar — sticky 56px shell header.
 *
 * Left: held-cursor glyph (blinking cursor — CSS `.glyph .cur`, disabled
 * under prefers-reduced-motion) + "beheld" wordmark + breadcrumb.
 * Right: pulsing green dot + "autenticado como @handle".
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ShellThemeToggle } from "@/components/app/ShellThemeToggle";
import { Wordmark } from "@/components/landing/BrandMark";
import { useT } from "@/i18n/I18nProvider";

function BlinkingGlyph({ size = 24 }: { size?: number }) {
  return (
    <span className="glyph" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M46 28 H30 V92 H46" stroke="#eef0ee" strokeWidth={7} fill="none" />
        <path d="M74 28 H90 V92 H74" stroke="#eef0ee" strokeWidth={7} fill="none" />
        <rect className="cur" x={53} y={45} width={14} height={30} fill="#58d36c" />
      </svg>
    </span>
  );
}

export function TopBar({ crumb, handle, right }: {
  /** Breadcrumb segments after the wordmark, e.g. ["dashboard", "@dev-511ac8da"]. */
  crumb: string[];
  /** Authenticated handle shown on the right ("@dev-…"). Ignored when `right` is set. */
  handle?: string;
  /** Public variant (design_handoff_perfil): replaces the "autenticado
   *  como…" block with a custom right side (toggle + CTA). */
  right?: ReactNode;
}) {
  const t = useT();
  return (
    <header className="app__top">
      <div className="app__brand">
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none" }}
              aria-label="beheld">
          <BlinkingGlyph />
          <Wordmark />
        </Link>
        <span className="crumb">
          {crumb.map((seg, i) => (
            <span key={i}>
              {" / "}
              {i === crumb.length - 1 ? <b>{seg}</b> : seg}
            </span>
          ))}
        </span>
      </div>
      {right ? (
        <div className="app__top__r">{right}</div>
      ) : (
        <div className="app__user">
          <ShellThemeToggle />
          <span className="dot" aria-hidden="true" />
          <span>
            {t("dashboard.top.authed_prefix")} <span className="you">{handle}</span>
          </span>
        </div>
      )}
    </header>
  );
}
