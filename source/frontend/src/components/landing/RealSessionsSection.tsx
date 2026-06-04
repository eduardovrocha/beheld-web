/**
 * RealSessionsSection — "sessões reais" deep-dive.
 *
 * Structure:
 *   intro line (under the section head, before subs)
 *   01 · o que é uma sessão real    — short body
 *   02 · o que o B3H31D vê numa sessão — body + ObservedSessionExample
 *                                         (key/value pairs + inline quote)
 *   03 · projeto por projeto, mês após mês — short body
 *   04 · o que fica local            — short body
 *   closing B3H31D quote (tight)
 */
import { B3H31DQuote } from "@/components/landing/B3H31DQuote";
import { Sub } from "@/components/landing/DaemonLocalSection";
import { Section } from "@/components/landing/Section";
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

type ExRow = {
  k: TKey;
  v: TKey;
};

const EX_ROWS: ExRow[] = [
  { k: "landing.sessions.s2.ex.k_project",  v: "landing.sessions.s2.ex.v_project" },
  { k: "landing.sessions.s2.ex.k_duration", v: "landing.sessions.s2.ex.v_duration" },
  { k: "landing.sessions.s2.ex.k_tools",    v: "landing.sessions.s2.ex.v_tools" },
  { k: "landing.sessions.s2.ex.k_test",     v: "landing.sessions.s2.ex.v_test" },
  { k: "landing.sessions.s2.ex.k_eco",      v: "landing.sessions.s2.ex.v_eco" },
  { k: "landing.sessions.s2.ex.k_pattern",  v: "landing.sessions.s2.ex.v_pattern" },
];

export function RealSessionsSection() {
  const t = useT();

  return (
    <Section
      id="sessoes-reais"
      num={t("landing.sessions.s1.num")}
      title={t("landing.sessions.title")}
    >
      <p className="cvd-intro reveal d1">{t("landing.sessions.intro")}</p>

      <Sub
        num={t("landing.sessions.s1.num")}
        eyebrow={t("landing.sessions.title")}
        title={t("landing.sessions.s1.title")}
        body={t("landing.sessions.s1.body")}
        delay={1}
      />

      <Sub
        num={t("landing.sessions.s2.num")}
        eyebrow={t("landing.sessions.title")}
        title={t("landing.sessions.s2.title")}
        body={t("landing.sessions.s2.body")}
        delay={2}
      >
        <div className="obs-ex">
          <div className="obs-ex-head">{t("landing.sessions.s2.ex.heading")}</div>
          <dl className="obs-ex-grid">
            {EX_ROWS.map((row) => (
              <div className="obs-ex-row" key={row.k}>
                <dt>{t(row.k)}</dt>
                <dd>{t(row.v)}</dd>
              </div>
            ))}
          </dl>
          <div className="obs-ex-quote">"{t("landing.sessions.s2.ex.quote")}"</div>
        </div>
      </Sub>

      <Sub
        num={t("landing.sessions.s3.num")}
        eyebrow={t("landing.sessions.title")}
        title={t("landing.sessions.s3.title")}
        body={t("landing.sessions.s3.body")}
        delay={3}
      />

      <Sub
        num={t("landing.sessions.s4.num")}
        eyebrow={t("landing.sessions.title")}
        title={t("landing.sessions.s4.title")}
        body={t("landing.sessions.s4.body")}
        delay={4}
      />

      <B3H31DQuote
        quoteKey="landing.sessions.closing_quote"
        attrKey="landing.sessions.closing_quote_attr"
      />
    </Section>
  );
}
