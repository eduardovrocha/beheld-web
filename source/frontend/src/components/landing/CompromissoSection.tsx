/**
 * CompromissoSection — the "forever free for developers" public
 * commitment, plus the install counter spec.
 *
 * Lives in the 5th tab of the landing. Pure presentational; copy is
 * fully i18n'd (`landing.compromisso.*`) across pt/en/es.
 *
 * Layout:
 *   header (eyebrow "compromisso · forever free for developers")
 *   intro paragraph
 *   five numbered sections (I..V) with paragraphs + (in IV) bullets
 *   signature block (pre code)
 *   metadata footer (small mono)
 *   install counter block (subheaded prose + bullets + pre + 3
 *                          subsections)
 *
 * Inline backticks in the i18n strings are intentionally rendered as
 * <code> via a small markdown-lite pass — this keeps the JSON
 * readable and lets translators preserve identifiers like
 * `~/.beheld/install-id` without touching JSX. Anything between two
 * backticks gets the .ck class for monospace styling.
 */
import { Fragment, type ReactNode } from "react";

import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

// Tiny `code` token parser. Returns a ReactNode list, splitting on
// backtick pairs. Safe because input is never user-controlled (it's
// our i18n JSON).
function renderInlineCode(text: string): ReactNode {
  const parts = text.split("`");
  return parts.map((p, i) =>
    i % 2 === 0 ? <Fragment key={i}>{p}</Fragment> : <code className="ck" key={i}>{p}</code>,
  );
}

function P({ k, className }: { k: TKey; className?: string }) {
  const t = useT();
  return <p className={className}>{renderInlineCode(t(k))}</p>;
}

function Bullet({ k }: { k: TKey }) {
  const t = useT();
  return <li>{renderInlineCode(t(k))}</li>;
}

// ── Section primitive used by I..V ────────────────────────────────────
function CompSection({
  numKey,
  titleKey,
  children,
}: {
  numKey: TKey;
  titleKey: TKey;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <section className="comp-section reveal d1">
      <header className="comp-section-head">
        <span className="comp-section-num">{t(numKey)}</span>
        <h3 className="comp-section-title">{t(titleKey)}</h3>
      </header>
      <div className="comp-section-body">{children}</div>
    </section>
  );
}

export function CompromissoSection() {
  const t = useT();
  return (
    <section className="block compromisso" id="compromisso-content">
      <div className="comp-head reveal d1">
        <span className="comp-eyebrow">{t("landing.compromisso.title")}</span>
      </div>

      <P k="landing.compromisso.intro" className="comp-intro reveal d2" />

      {/* I · o que custa zero */}
      <CompSection
        numKey="landing.compromisso.s1.num"
        titleKey="landing.compromisso.s1.title"
      >
        <P k="landing.compromisso.s1.p1" />
        <P k="landing.compromisso.s1.p2" />
        <P k="landing.compromisso.s1.p3" />
      </CompSection>

      {/* II · o que não acontece */}
      <CompSection
        numKey="landing.compromisso.s2.num"
        titleKey="landing.compromisso.s2.title"
      >
        <P k="landing.compromisso.s2.p1" />
        <P k="landing.compromisso.s2.p2" />
        <P k="landing.compromisso.s2.p3" />
        <P k="landing.compromisso.s2.p4" />
        <P k="landing.compromisso.s2.p5" />
      </CompSection>

      {/* III · como o Beheld se paga */}
      <CompSection
        numKey="landing.compromisso.s3.num"
        titleKey="landing.compromisso.s3.title"
      >
        <P k="landing.compromisso.s3.p1" />
        <P k="landing.compromisso.s3.p2" />
        <P k="landing.compromisso.s3.p3" />
      </CompSection>

      {/* IV · se o Beheld mudar de mãos */}
      <CompSection
        numKey="landing.compromisso.s4.num"
        titleKey="landing.compromisso.s4.title"
      >
        <P k="landing.compromisso.s4.p1" />
        <P k="landing.compromisso.s4.p2" />
        <P k="landing.compromisso.s4.bullets_intro" />
        <ul className="comp-bullets">
          <Bullet k="landing.compromisso.s4.b1" />
          <Bullet k="landing.compromisso.s4.b2" />
          <Bullet k="landing.compromisso.s4.b3" />
        </ul>
      </CompSection>

      {/* V · como você verifica que isto vale */}
      <CompSection
        numKey="landing.compromisso.s5.num"
        titleKey="landing.compromisso.s5.title"
      >
        <P k="landing.compromisso.s5.p1" />
        <P k="landing.compromisso.s5.p2" />
        <P k="landing.compromisso.s5.p3" />
        <P k="landing.compromisso.s5.p4" />
      </CompSection>

      {/* Assinatura */}
      <div className="comp-sig reveal d2">
        <div className="comp-sig-heading">{t("landing.compromisso.sig.heading")}</div>
        <pre className="comp-sig-code"><code>{t("landing.compromisso.sig.code")}</code></pre>
        <p className="comp-sig-foot">{t("landing.compromisso.sig.foot1")}</p>
        <p className="comp-sig-foot">{t("landing.compromisso.sig.foot2")}</p>
        <p className="comp-sig-meta">{renderInlineCode(t("landing.compromisso.sig.meta"))}</p>
      </div>

      {/* Contador de instalações */}
      <div className="comp-counter reveal d2">
        <h3 className="comp-counter-title">{t("landing.compromisso.counter.title")}</h3>
        <P k="landing.compromisso.counter.intro" />

        <P k="landing.compromisso.counter.how_intro" />
        <ul className="comp-bullets">
          <Bullet k="landing.compromisso.counter.how_b1" />
          <Bullet k="landing.compromisso.counter.how_b2" />
          <Bullet k="landing.compromisso.counter.how_b3" />
          <Bullet k="landing.compromisso.counter.how_b4" />
        </ul>

        <P k="landing.compromisso.counter.payload_label" />
        <pre className="comp-code-block"><code>{t("landing.compromisso.counter.payload_code")}</code></pre>

        <h4 className="comp-counter-sub">{t("landing.compromisso.counter.optout_title")}</h4>
        <P k="landing.compromisso.counter.optout_body" />

        <h4 className="comp-counter-sub">{t("landing.compromisso.counter.what_title")}</h4>
        <P k="landing.compromisso.counter.what_p1" />
        <P k="landing.compromisso.counter.what_p2" />

        <h4 className="comp-counter-sub">{t("landing.compromisso.counter.guard_title")}</h4>
        <ul className="comp-bullets">
          <Bullet k="landing.compromisso.counter.guard_b1" />
          <Bullet k="landing.compromisso.counter.guard_b2" />
          <Bullet k="landing.compromisso.counter.guard_b3" />
        </ul>
        <P k="landing.compromisso.counter.guard_close" />
      </div>
    </section>
  );
}
