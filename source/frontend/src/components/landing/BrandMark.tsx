/**
 * BrandMark — the "held-cursor" identity: two ink brackets enclosing a
 * blinking green block cursor.
 *
 *   [ ▮ ]
 *
 * Conceptually the B3H31D HOLDS your work IN VIEW; the contained signal
 * is a terminal cursor — alive. Brackets in --ink, cursor in --signal.
 * Stroke width nudges up at smaller render sizes for legibility (6 at
 * large display, 7 at small, 8 at favicon — per the design handoff).
 *
 * `Wordmark` is the matching "beheld" lockup text: JetBrains Mono 700,
 * -0.04em tracking, with the lowercase "b" in signal green (.lk-word
 * styles in landing-v2.css).
 */
export type BrandGlyphProps = {
  /** Rendered square size in px. */
  size?: number;
};

function strokeFor(size: number): number {
  if (size <= 20) return 8;
  if (size <= 48) return 7;
  return 6;
}

export function BrandGlyph({ size = 24 }: BrandGlyphProps) {
  const sw = strokeFor(size);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M46 28 H30 V92 H46" stroke="#eef0ee" strokeWidth={sw} fill="none" />
      <path d="M74 28 H90 V92 H74" stroke="#eef0ee" strokeWidth={sw} fill="none" />
      <rect x={53} y={45} width={14} height={30} fill="#58d36c" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="lk-word">
      <span className="b">b</span>eheld
    </span>
  );
}
