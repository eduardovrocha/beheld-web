/**
 * Steps (03) — três passos: instalação única ($ beheld init), contínuo,
 * snapshot quando quiser ($ beheld snapshot).
 */
import { Eyebrow } from "@/components/landing/Eyebrow";

import { useT } from "../T";
import { STEPS } from "../content";

export function Steps() {
  const t = useT();
  return (
    <section style={{ background: "var(--bg-2)" }}>
      <div className="wrap">
        <Eyebrow idx="03">{t("steps.eyebrow")}</Eyebrow>
        <div className="steps" data-reveal>
          {STEPS.map((step) => (
            <div key={step.key} className="step">
              <p className="step__n">{t(`steps.${step.key}.n`)}</p>
              {step.cmd ? (
                <p className="step__cmd">
                  <span className="pmt">$</span> {t(`steps.${step.key}.cmd`)}
                </p>
              ) : (
                <p
                  className="step__t"
                  style={{
                    fontSize: 15,
                    fontFamily: "var(--mono)",
                    color: "var(--ink-3)",
                    fontWeight: 400,
                    marginBottom: 14,
                  }}
                >
                  {t(`steps.${step.key}.t`)}
                </p>
              )}
              <p className="step__d">{t(`steps.${step.key}.d`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
