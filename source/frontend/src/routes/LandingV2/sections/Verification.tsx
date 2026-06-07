/**
 * Verification (#verificacao · 06) — lista "não faz" (3 colunas), cadeia
 * de verificação em cinco camadas e FAQ accordion (uma aberta por vez).
 *
 * O FAQ segue a a11y do componente FAQ legado (kit README §5):
 * aria-expanded + aria-controls no botão, role="region" no painel, e
 * max-height animado via scrollHeight num layout effect.
 */
import { useLayoutEffect, useRef, useState } from "react";

import { Eyebrow } from "@/components/landing/Eyebrow";

import { T, useT } from "../T";
import { CHAIN_ROWS, FAQ_ITEMS, NOTS } from "../content";

type FaqKey = (typeof FAQ_ITEMS)[number];

export function Verification() {
  const t = useT();
  const [openFaq, setOpenFaq] = useState<FaqKey | null>(null);
  const panelRefs = useRef(new Map<FaqKey, HTMLDivElement>());

  // scrollHeight só é conhecido pós-render — anima num layout effect.
  useLayoutEffect(() => {
    panelRefs.current.forEach((el, key) => {
      el.style.maxHeight = key === openFaq ? `${el.scrollHeight}px` : "0px";
    });
  }, [openFaq]);

  return (
    <section id="verificacao">
      <div className="wrap">
        <Eyebrow idx="06">{t("verification.eyebrow")}</Eyebrow>
        <h2 className="h-sect" style={{ maxWidth: "22ch" }}>{t("verification.h")}</h2>

        <ul className="nots cols3" style={{ marginTop: 40 }} data-reveal>
          {NOTS.map((key) => (
            <li key={key}>
              <span className="no">✗</span>
              <span><T k={`verification.nots.${key}`} /></span>
            </li>
          ))}
        </ul>

        <h3 style={{ fontSize: 20, margin: "64px 0 6px" }}>{t("verification.chain.h")}</h3>
        <div style={{ margin: "18px 0 20px" }}>
          <span className="tier"><span className="x"></span>{t("verification.chain.tier")}</span>
        </div>
        <div className="chain" data-reveal>
          {CHAIN_ROWS.map((key) => (
            <div key={key} className="chain__row">
              <div className="chain__ck">✓</div>
              <div>
                <div className="chain__t">
                  {t(`verification.chain.rows.${key}.t`)}{" "}
                  <span>{t(`verification.chain.rows.${key}.tag`)}</span>
                </div>
                <div className="chain__d">{t(`verification.chain.rows.${key}.d`)}</div>
              </div>
              <div className="chain__st">{t("verification.chain.verified")}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 20, margin: "64px 0 8px" }}>{t("verification.faq.h")}</h3>
        <p className="lede" style={{ marginBottom: 28 }}>{t("verification.faq.lede")}</p>
        <div className="faq cols2" data-reveal>
          {FAQ_ITEMS.map((key) => {
            const isOpen = openFaq === key;
            return (
              <div key={key} className="faq__item" open-state={isOpen ? "1" : "0"}>
                <button
                  className="faq__q"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${key}`}
                  onClick={() => setOpenFaq(isOpen ? null : key)}
                >
                  {t(`verification.faq.items.${key}.q`)}
                  <span className="faq__sign">+</span>
                </button>
                <div
                  id={`faq-a-${key}`}
                  role="region"
                  className="faq__a"
                  ref={(el) => {
                    if (el) panelRefs.current.set(key, el);
                    else panelRefs.current.delete(key);
                  }}
                >
                  <div>
                    <span className="pin">→</span> {t(`verification.faq.items.${key}.a`)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
