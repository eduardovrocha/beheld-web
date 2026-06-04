/**
 * Section — wrapper used by the landing v5's content blocks.
 *
 * Renders:
 *   <section class="block">
 *     <div class="sechead">
 *       <span class="num">{num}</span>
 *       <h2>{title}</h2>
 *       <span class="right">{aside}</span>
 *     </div>
 *     {children}
 *   </section>
 *
 * The outer `.wrap` (max-width 1080px container) lives on the page's
 * `<main>`, so sections do not double-wrap. All visual styling lives
 * in index.css under `section.block` / `.sechead`. Pass `id` to enable
 * in-page #anchors.
 */
import type { ReactNode } from "react";

export type SectionProps = {
  /** Optional eyebrow number/glyph shown to the left of the title. */
  num?: ReactNode;
  /** Main heading. */
  title: ReactNode;
  /** Optional right-aligned mono caption (hidden under 600px). */
  aside?: ReactNode;
  /** Anchor id for in-page navigation. */
  id?: string;
  /** Drop the top hairline border (used for the first content block). */
  noBorderTop?: boolean;
  children: ReactNode;
};

export function Section({
  num,
  title,
  aside,
  id,
  noBorderTop = false,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className="block"
      style={noBorderTop ? { borderTop: "none" } : undefined}
    >
      <div className="sechead reveal">
        {num !== undefined && <span className="num">{num}</span>}
        <h2>{title}</h2>
        {aside !== undefined && <span className="right">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
