/**
 * Manifesto (#manifesto · 01) — corpo largo + citação do B3H31D na
 * lateral (mani-split).
 */
import { Eyebrow } from "@/components/landing/Eyebrow";

import { T, useT } from "../T";

export function Manifesto() {
  const t = useT();
  return (
    <section className="manifesto" id="manifesto">
      <div className="wrap">
        <Eyebrow idx="01">{t("manifesto.eyebrow")}</Eyebrow>
        <div className="mani-split" data-reveal>
          <div className="manifesto__body" style={{ maxWidth: "none" }}>
            <p className="manifesto__lead">{t("manifesto.lead")}</p>
            <p>{t("manifesto.p1")}</p>
            <p><T k="manifesto.p2" /></p>
            <p><T k="manifesto.p3" /></p>
          </div>
          <blockquote className="quote">
            {t("manifesto.quote")}
            <cite className="quote__by">{t("manifesto.quoteBy")}</cite>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
