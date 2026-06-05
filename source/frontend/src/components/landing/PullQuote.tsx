/**
 * PullQuote — pull-quote in B3H31D's first-person voice.
 *
 * Visual (landing v2): large sans serif, curly quote glyphs in signal
 * green via CSS ::before/::after, mono letter-spaced attribution.
 * Variants via className: `quote--closing` (56px top margin, used at
 * the end of Daemon/Sessões), `quote--narrow` (40ch cap).
 */
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

export type PullQuoteProps = {
  /** i18n key for the quote body. */
  quoteKey: TKey;
  /** i18n key for the attribution (e.g. "B3H31D"). */
  attrKey: TKey;
  /** Extra classes on the blockquote (quote--closing, quote--narrow). */
  className?: string;
};

export function PullQuote({ quoteKey, attrKey, className }: PullQuoteProps) {
  const t = useT();
  return (
    <blockquote className={className ? `quote ${className}` : "quote"}>
      {t(quoteKey)}
      <cite className="quote__by">— {t(attrKey)}</cite>
    </blockquote>
  );
}
