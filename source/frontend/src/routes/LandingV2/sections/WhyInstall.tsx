/**
 * WhyInstall (#por-que-hoje · beat não-numerado) — três cards de valor
 * no dia 1, entre a thesis band e a seção B3H31D. Eyebrow com "·" no
 * lugar do índice (variante .idx--dot).
 */
import { useT } from "../T";
import { WHY_INSTALL_CARDS } from "../content";

export function WhyInstall() {
  const t = useT();
  return (
    <section id="por-que-hoje">
      <div className="wrap">
        <p className="eyebrow">
          <span className="idx idx--dot">·</span> {t("whyInstall.eyebrow")} <span className="line"></span>
        </p>
        <div className="two-col">
          <h2 className="h-sect">{t("whyInstall.h")}</h2>
          <p className="lede">{t("whyInstall.lede")}</p>
        </div>
        <div className="grid grid--3" data-reveal style={{ marginTop: 48 }}>
          {WHY_INSTALL_CARDS.map((key) => (
            <div key={key} className="cell cell--surface">
              <p className="card__k">{t(`whyInstall.cards.${key}.k`)}</p>
              <p className="card__t">{t(`whyInstall.cards.${key}.t`)}</p>
              <p className="card__d">{t(`whyInstall.cards.${key}.d`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
