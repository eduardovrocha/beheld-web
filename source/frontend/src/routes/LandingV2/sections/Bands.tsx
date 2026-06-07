/**
 * Bands — faixas full-width entre seções: Triangle (posicionamento),
 * ToolsStrip, Thesis (categoria em uma frase) e Consequence (visão de
 * longo prazo).
 */
import { T, useT } from "../T";
import { TRIANGLE_LINES } from "../content";

export function TriangleBand() {
  const t = useT();
  return (
    <section className="triangle" aria-label="posicionamento">
      <div className="wrap triangle__in">
        {TRIANGLE_LINES.map((line) => (
          <p
            key={line.brand}
            className={`triangle__line ${line.us ? "triangle__line--us" : ""}`}
          >
            <span className={`triangle__brand ${line.us ? "triangle__brand--us" : ""}`}>
              {t(`triangle.brands.${line.brand}`)}
            </span>
            <span className="triangle__verb">
              {t(`triangle.verbs.${line.verb}`)}{" "}
              <span className={`triangle__what ${line.us ? "triangle__what--us" : ""}`}>
                {t(`triangle.terms.${line.term}`)}
              </span>
              .
            </span>
          </p>
        ))}
      </div>
    </section>
  );
}

export function ToolsStrip() {
  const t = useT();
  return (
    <div className="tools">
      <div className="wrap tools__in">
        <span className="tools__lab">{t("tools.label")}</span>
        <span className="tools__item">{t("tools.items.claude")}</span>
        <span className="tools__item">{t("tools.items.continue")}</span>
        <span className="tools__item muted">{t("tools.items.mcp")}</span>
        <span className="tools__item muted">{t("tools.items.ides")}</span>
      </div>
    </div>
  );
}

export function ThesisBand() {
  const t = useT();
  return (
    <section className="thesis-band">
      <div className="wrap thesis-band__in">
        <p className="thesis-band__lab">{t("thesis.label")}</p>
        <p className="thesis-band__h"><T k="thesis.body" /></p>
      </div>
    </section>
  );
}

export function ConsequenceBand() {
  const t = useT();
  return (
    <section className="consequence-band">
      <div className="wrap consequence-band__in">
        <p className="consequence-band__lab">{t("consequence.label")}</p>
        <p className="consequence-band__h"><T k="consequence.h" /></p>
        <p className="consequence-band__sub">{t("consequence.sub")}</p>
      </div>
    </section>
  );
}
