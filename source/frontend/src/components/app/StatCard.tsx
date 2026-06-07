/**
 * StatCard — one cell of the 3-up "hairline by background" stats grid.
 *
 *   <div .stats>            ← gap:1px on --line bg (the hairlines)
 *     <StatCard …/> ×3
 *
 * Gramática de sinal: pill ok = confirmed (green), warn = recommended
 * to upgrade (amber), empty = null state (dim, no fill). Value variants
 * mirror the same scale (`ok`, `dim`); phrase values (`signature_only`)
 * drop to 30px.
 */
import type { ReactNode } from "react";

export function StatsRow({ children }: { children: ReactNode }) {
  return <div className="stats">{children}</div>;
}

export type StatPillVariant = "ok" | "warn" | "empty";

export function StatPill({ variant, children }: { variant: StatPillVariant; children: ReactNode }) {
  return <span className={`pill pill--${variant}`}>{children}</span>;
}

export function StatCard({ kicker, pill, value, valueTone, phrase = false, description, foot }: {
  kicker: string;
  pill?: ReactNode;
  value: ReactNode;
  /** Value color: default --ink; "dim" for empty zeros; "ok" for signal. */
  valueTone?: "dim" | "ok";
  /** Token-style phrase value (smaller size, e.g. `signature_only`). */
  phrase?: boolean;
  description: ReactNode;
  foot?: ReactNode;
}) {
  const vCls = ["stat__v", valueTone, phrase ? "stat__v--phrase" : null].filter(Boolean).join(" ");
  return (
    <div className="stat">
      <p className="stat__k">{kicker} {pill}</p>
      <p className={vCls}>{value}</p>
      <p className="stat__d">{description}</p>
      {foot && <p className="stat__foot">{foot}</p>}
    </div>
  );
}
