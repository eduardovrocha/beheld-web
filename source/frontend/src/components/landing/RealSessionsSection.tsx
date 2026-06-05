/**
 * RealSessionsSection — "04 sessões reais": the film of the work, not
 * the photo under pressure.
 *
 * Structure (mirrors the reference DOM 1:1):
 *   - two-col header: h2 + two h3/p blocks
 *   - .sess-split: example observed-session card (mono key/value rows,
 *     green highlights on "sim" and "TDD-first") + two h3/p blocks
 *   - closing B3H31D pull quote (narrow)
 */
import { Eyebrow } from "@/components/landing/Eyebrow";
import { PullQuote } from "@/components/landing/PullQuote";
import { useT } from "@/i18n/I18nProvider";

export function RealSessionsSection() {
  const t = useT();
  return (
    <section id="sessoes">
      <div className="wrap">
        <Eyebrow idx="04">{t("landing.sessions.eyebrow")}</Eyebrow>
        <div className="two-col">
          <h2 className="h-sect">{t("landing.sessions.h2")}</h2>
          <div>
            <h3 className="h-mini">{t("landing.sessions.what_title")}</h3>
            <p className="lede lede--gap">{t("landing.sessions.what_body")}</p>
            <h3 className="h-mini">{t("landing.sessions.sees_title")}</h3>
            <p className="lede">{t("landing.sessions.sees_body")}</p>
          </div>
        </div>

        <div className="sess-split reveal">
          <div className="card">
            <p className="card__k">{t("landing.sessions.ex.heading")}</p>
            <div className="session">
              <div className="session__row">
                <span className="session__k">{t("landing.sessions.ex.k_project")}</span>
                <span className="session__v">{t("landing.sessions.ex.v_project")}</span>
              </div>
              <div className="session__row">
                <span className="session__k">{t("landing.sessions.ex.k_duration")}</span>
                <span className="session__v">{t("landing.sessions.ex.v_duration")}</span>
              </div>
              <div className="session__row">
                <span className="session__k">{t("landing.sessions.ex.k_tools")}</span>
                <span className="session__v">{t("landing.sessions.ex.v_tools")}</span>
              </div>
              <div className="session__row">
                <span className="session__k">{t("landing.sessions.ex.k_test")}</span>
                <span className="session__v">
                  <span className="h">{t("landing.sessions.ex.v_test_hl")}</span>
                  {t("landing.sessions.ex.v_test_rest")}
                </span>
              </div>
              <div className="session__row">
                <span className="session__k">{t("landing.sessions.ex.k_eco")}</span>
                <span className="session__v">{t("landing.sessions.ex.v_eco")}</span>
              </div>
              <div className="session__row">
                <span className="session__k">{t("landing.sessions.ex.k_pattern")}</span>
                <span className="session__v">
                  <span className="h">{t("landing.sessions.ex.v_pattern")}</span>
                </span>
              </div>
            </div>
            <p className="session__cap">“{t("landing.sessions.ex.caption")}”</p>
          </div>

          <div>
            <h3 className="h-mini">{t("landing.sessions.months_title")}</h3>
            <p className="lede lede--gap">{t("landing.sessions.months_body")}</p>
            <h3 className="h-mini">{t("landing.sessions.local_title")}</h3>
            <p className="lede">{t("landing.sessions.local_body")}</p>
          </div>
        </div>

        <PullQuote
          quoteKey="landing.sessions.quote"
          attrKey="landing.sessions.quote_attr"
          className="quote--closing quote--narrow"
        />
      </div>
    </section>
  );
}
