/**
 * B3H31DQuote — pull-quote in B3H31D's first-person voice.
 *
 * Visual (per the landing v5 tabs spec):
 *   - Background = --term-bg, left border 2px --accent.
 *   - Paragraph body uses the same typography as DeepDiveCard
 *     paragraphs: var(--sans), ~15px, line-height 1.65. The site
 *     globally disables italics (see index.css), so the only visual
 *     marker of "this is a quote" is the left accent border plus the
 *     accent mono attribution.
 *   - Attribution prefixed with "— " in --accent mono uppercase.
 *
 * Used three times: at the end of the Manifesto tab (intro quote),
 * the end of the Daemon deep-dive, and the end of the Sessões
 * deep-dive.
 */
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

export type B3H31DQuoteProps = {
  /** i18n key for the quote body. */
  quoteKey: TKey;
  /** i18n key for the attribution text (e.g. "B3H31D"). */
  attrKey: TKey;
  /** Optional anchor id (rarely needed; tabs handle deep-linking). */
  id?: string;
};

export function B3H31DQuote({ quoteKey, attrKey, id }: B3H31DQuoteProps) {
  const t = useT();
  return (
    <blockquote id={id} className="b3-quote reveal d2">
      <p className="b3-quote__body">{t(quoteKey)}</p>
      <footer className="b3-quote__attr">— {t(attrKey)}</footer>
    </blockquote>
  );
}
