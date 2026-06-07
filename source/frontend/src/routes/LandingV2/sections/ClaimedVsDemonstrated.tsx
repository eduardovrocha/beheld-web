/**
 * ClaimedVsDemonstrated (05) — o dev declara, o Beheld atesta: linhas
 * com badge ✓ (confirmado), ⚠ (sinal limitado) e ○ (não verificado).
 */
import { Eyebrow } from "@/components/landing/Eyebrow";

import { T, useT } from "../T";
import { CVD_ROWS } from "../content";

const BADGE_SYMBOL = { ok: "✓", warn: "⚠", null: "○" } as const;
const BADGE_CLASS = {
  ok: "cvd__badge--ok",
  warn: "cvd__badge--warn",
  null: "cvd__badge--null",
} as const;

export function ClaimedVsDemonstrated() {
  const t = useT();
  return (
    <section style={{ background: "var(--bg-2)" }}>
      <div className="wrap">
        <Eyebrow idx="05">{t("cvd.eyebrow")}</Eyebrow>

        <div className="two-col">
          <h2 className="h-sect">{t("cvd.h")}</h2>
          <p className="lede">{t("cvd.lede")}</p>
        </div>

        <div className="cvd" style={{ marginTop: 48 }} data-reveal>
          {CVD_ROWS.map((row) => {
            const isLimited = row.badge === "warn" || row.badge === "null";
            return (
              <div
                key={row.key}
                className={`cvd__row ${isLimited ? "cvd__row--limited" : ""}`}
              >
                <div className={`cvd__badge ${BADGE_CLASS[row.badge]}`}>
                  {BADGE_SYMBOL[row.badge]}
                </div>
                <div>
                  <p className="cvd__claim"><T k={`cvd.rows.${row.key}.claim`} /></p>
                  <p className="cvd__ev"><T k={`cvd.rows.${row.key}.ev`} /></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
