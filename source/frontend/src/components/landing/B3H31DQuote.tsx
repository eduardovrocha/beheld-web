/**
 * B3H31DQuote — pull-quote callout in B3H31D's first-person voice.
 *
 * Three appearances in the landing:
 *   - the standalone intro quote after the Manifesto
 *   - the closing quote at the end of the DaemonLocalSection
 *   - the closing quote at the end of the RealSessionsSection
 *
 * Visual: a single block with a left accent border, large lede-sized
 * text in `--text`, and a mono `— B3H31D` attribution in `--accent`.
 * Spans the wrap width; sits inside its own `.block` section so the
 * hairlines top/bottom give it breathing room.
 *
 * Variant `lead` increases padding and font size for the prominent
 * standalone quote; default is `tight` for closing quotes inside
 * sections.
 */
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

export type B3H31DQuoteProps = {
  /** i18n key for the quote body. */
  quoteKey: TKey;
  /** i18n key for the attribution text (e.g. "B3H31D"). */
  attrKey: TKey;
  /** Anchor id for the standalone variant. */
  id?: string;
  /** "lead" for the standalone intro quote, "tight" inside sections. */
  variant?: "lead" | "tight";
};

export function B3H31DQuote({
  quoteKey,
  attrKey,
  id,
  variant = "tight",
}: B3H31DQuoteProps) {
  const t = useT();
  const className = variant === "lead" ? "b3-quote b3-quote--lead" : "b3-quote";

  if (variant === "lead") {
    // Lead variant gets its own section.block, since it stands alone
    // between Manifesto and CaptureCards.
    return (
      <section id={id} className="block">
        <blockquote className={`${className} reveal d1`}>
          <p className="b3-quote__body">{t(quoteKey)}</p>
          <footer className="b3-quote__attr">— {t(attrKey)}</footer>
        </blockquote>
      </section>
    );
  }

  // Tight variant is meant to be nested at the end of another section
  // — no <section> wrapper here.
  return (
    <blockquote className={`${className} reveal d2`}>
      <p className="b3-quote__body">{t(quoteKey)}</p>
      <footer className="b3-quote__attr">— {t(attrKey)}</footer>
    </blockquote>
  );
}
