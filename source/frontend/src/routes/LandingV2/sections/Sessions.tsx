/**
 * Sessions (#sessoes · 04) — o que é uma sessão real, exemplo de sessão
 * observada (card mono) e citação do B3H31D.
 */
import { Eyebrow } from "@/components/landing/Eyebrow";

import { T, useT } from "../T";

const EXAMPLE_ROWS = ["project", "duration", "tools", "testCtx", "eco", "pattern"] as const;

export function Sessions() {
  const t = useT();
  return (
    <section id="sessoes">
      <div className="wrap">
        <Eyebrow idx="04">{t("sessions.eyebrow")}</Eyebrow>

        <div className="two-col">
          <h2 className="h-sect">{t("sessions.h")}</h2>
          <div>
            <h3 style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 8px" }}>
              {t("sessions.isRealH")}
            </h3>
            <p className="lede" style={{ marginBottom: 24 }}>
              {t("sessions.isRealP")}
            </p>
            <h3 style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 8px" }}>
              {t("sessions.seesH")}
            </h3>
            <p className="lede">{t("sessions.seesP")}</p>
          </div>
        </div>

        <div className="sess-split" style={{ marginTop: 48 }} data-reveal>
          <div className="card" style={{ margin: 0 }}>
            <p className="card__k">{t("sessions.example.k")}</p>
            <div className="session">
              {EXAMPLE_ROWS.map((row) => (
                <div key={row} className="session__row">
                  <span className="session__k">{t(`sessions.example.${row}`)}</span>
                  <span className="session__v"><T k={`sessions.example.${row}V`} /></span>
                </div>
              ))}
            </div>
            <p className="session__cap">{t("sessions.example.cap")}</p>
          </div>

          <div>
            <h3 style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 8px" }}>
              {t("sessions.byProjectH")}
            </h3>
            <p className="lede" style={{ marginBottom: 28 }}>
              <T k="sessions.byProjectP" />
            </p>
            <h3 style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 8px" }}>
              {t("sessions.localH")}
            </h3>
            <p className="lede">{t("sessions.localP")}</p>
          </div>
        </div>

        <blockquote className="quote" style={{ margin: "56px 0 0", maxWidth: "40ch" }}>
          {t("sessions.quote")}
          <cite className="quote__by">{t("sessions.quoteBy")}</cite>
        </blockquote>
      </div>
    </section>
  );
}
