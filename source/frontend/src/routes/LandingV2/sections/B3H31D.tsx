/**
 * B3H31D (#B3H31D · 02) — 4 cards de atributos, "como vive na sua
 * máquina" + pipeline (flow), tabela de privacidade e card always-on.
 */
import { Eyebrow } from "@/components/landing/Eyebrow";

import { T, useT } from "../T";
import { B3H31D_CARDS, PRIVACY_ROWS } from "../content";

export function B3H31D() {
  const t = useT();

  return (
    <section id="B3H31D">
      <div className="wrap">
        <Eyebrow idx="02">{t("B3H31D.eyebrow")}</Eyebrow>

        <div className="grid grid--4" data-reveal>
          {B3H31D_CARDS.map((card) => (
            <div key={card.key} className="cell cell--surface">
              <p className="card__k">{t(`B3H31D.cards.${card.key}.k`)}</p>
              <p className={`card__t ${card.accent ? "sig" : ""}`}>
                {t(`B3H31D.cards.${card.key}.t`)}
              </p>
              <p className="card__d">{t(`B3H31D.cards.${card.key}.d`)}</p>
            </div>
          ))}
        </div>

        <div className="two-col" style={{ marginTop: 64 }}>
          <div>
            <h2
              className="h-sect"
              style={{
                fontSize: "clamp(24px,3.2vw,34px)",
                maxWidth: "none",
                whiteSpace: "nowrap",
              }}
            >
              {t("B3H31D.howLives.h")}
            </h2>
            <h3 style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 8px" }}>
              {t("B3H31D.howLives.observesH")}
            </h3>
            <p className="lede" style={{ marginBottom: 24 }}>
              {t("B3H31D.howLives.observesP")}
            </p>
            <h3 style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 8px" }}>
              {t("B3H31D.howLives.livesH")}
            </h3>
            <p className="lede">{t("B3H31D.howLives.livesP")}</p>
          </div>

          <div data-reveal>
            <div className="flow">
              <div className="flow__node flow__node--source">{t("B3H31D.flow.harness")}</div>
              <div className="flow__arrow">↓</div>
              <div className="flow__node">
                {t("B3H31D.flow.server")} <span className="port">{t("B3H31D.flow.serverPort")}</span>
              </div>
              <div className="flow__arrow">↓</div>
              <div className="flow__node">
                {t("B3H31D.flow.engine")} <span className="port">{t("B3H31D.flow.enginePort")}</span>
              </div>
              <div className="flow__arrow">↓</div>
              <div className="flow__node flow__node--store">
                {t("B3H31D.flow.store")} <span className="port">{t("B3H31D.flow.storePort")}</span>
              </div>
            </div>
            <p className="flow__cap">{t("B3H31D.flow.cap")}</p>
          </div>
        </div>

        <h3 style={{ fontSize: 18, color: "var(--ink)", margin: "64px 0 18px" }}>
          {t("B3H31D.table.h")}
        </h3>
        <table className="ptable">
          <thead>
            <tr>
              <th>{t("B3H31D.table.col1")}</th>
              <th>{t("B3H31D.table.col2")}</th>
            </tr>
          </thead>
          <tbody>
            {PRIVACY_ROWS.map((row) => (
              <tr key={row}>
                <td>{t(`B3H31D.table.rows.${row}.d`)}</td>
                <td><T k={`B3H31D.table.rows.${row}.v`} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="card" style={{ marginTop: 32 }}>
          <p className="card__k" style={{ color: "var(--signal-ink)" }}>
            {t("B3H31D.alwaysOn.k")}
          </p>
          <p className="card__d" style={{ fontSize: 15 }}>
            {t("B3H31D.alwaysOn.d")}
          </p>
        </div>
      </div>
    </section>
  );
}
