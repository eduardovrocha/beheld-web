/**
 * Eyebrow — the mono section label that opens every numbered section:
 *
 *   ▪ 01 manifesto ───────────────
 *
 * Green square (CSS ::before) + signal-green index + label + a hairline
 * that flexes to fill the row. Styles in landing-v2.css (.eyebrow).
 */
import type { ReactNode } from "react";

export type EyebrowProps = {
  /** Section index ("01".."07"), rendered in signal green. */
  idx: string;
  children: ReactNode;
};

export function Eyebrow({ idx, children }: EyebrowProps) {
  return (
    <p className="eyebrow">
      <span className="idx">{idx}</span> {children} <span className="line" />
    </p>
  );
}
