/**
 * Verification — "06 verificação": what it refuses to do + the 5-layer
 * verification chain + FAQ.
 *
 * Structure (mirrors the reference DOM 1:1):
 *   - h2 "O que ele não faz é tão importante quanto o que faz."
 *   - .nots.cols3 — six "✗ não X" guarantees (3-col grid)
 *   - chain heading + tier pill (tier · fully_verifiable)
 *   - .chain — 5 rows: ✓ + title + tier token + body + VERIFIED label
 *   - FAQ heading + lede + <FAQ /> accordion
 */
import { Eyebrow } from "@/components/landing/Eyebrow";
import { FAQ } from "@/components/landing/FAQ";
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

type NotKey = "cloud" | "code" | "score" | "tell" | "charge" | "lockin";
const NOTS: NotKey[] = ["cloud", "code", "score", "tell", "charge", "lockin"];

type ChainKey = "l1" | "l2" | "l3" | "l4" | "l5";
const CHAIN_KEYS: ChainKey[] = ["l1", "l2", "l3", "l4", "l5"];
const CHAIN_TIERS: Record<ChainKey, string> = {
  l1: "signature_only",
  l2: "chain_intact",
  l3: "identity_verified",
  l4: "engine_verified",
  l5: "fully_verifiable",
};

export function Verification() {
  const t = useT();
  return (
    <section id="verificacao">
      <div className="wrap">
        <Eyebrow idx="06">{t("landing.verify.eyebrow")}</Eyebrow>
        <h2 className="h-sect">{t("landing.verify.h2")}</h2>

        <ul className="nots cols3 reveal">
          {NOTS.map((n) => (
            <li key={n}>
              <span className="no">✗</span>
              <span>
                <b>{t(`landing.not.${n}.t` as TKey)}</b> {t(`landing.not.${n}.b` as TKey)}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="h-chain">{t("landing.chain.title")}</h3>
        <div className="tier-wrap">
          <span className="tier">
            <span className="x" />
            {t("landing.chain.tier")}
          </span>
        </div>
        <div className="chain reveal">
          {CHAIN_KEYS.map((k) => (
            <div key={k} className="chain__row">
              <div className="chain__ck">✓</div>
              <div>
                <div className="chain__t">
                  {t(`landing.chain.${k}.t` as TKey)} <span>{CHAIN_TIERS[k]}</span>
                </div>
                <div className="chain__d">{t(`landing.chain.${k}.b` as TKey)}</div>
              </div>
              <div className="chain__st">{t("landing.chain.verified")}</div>
            </div>
          ))}
        </div>

        <h3 className="h-faq">{t("landing.faq.title")}</h3>
        <p className="lede lede--faq">{t("landing.faq.lede")}</p>
        <FAQ />
      </div>
    </section>
  );
}
