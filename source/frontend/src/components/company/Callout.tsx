/**
 * Callout — the beheld guarantee block (design_handoff_contato §4).
 * `info` (default): green left border + ✓ — a confirmation, NOT a warning.
 * `warn`: amber — true attention states (submit failure, limits).
 * Styled by .callout in app-contact.css (scoped .app-v2).
 */
import type { ReactNode } from "react";

export function Callout({ variant = "info", role, children }: {
  variant?: "info" | "warn";
  /** e.g. "status" + aria-live for the privacy promise. */
  role?: string;
  children: ReactNode;
}) {
  return (
    <div className={`callout${variant === "warn" ? " callout--warn" : ""}`}
         role={role} aria-live={role === "status" ? "polite" : undefined}>
      <span className="ic" aria-hidden="true">{variant === "warn" ? "⚠" : "✓"}</span>
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  );
}
