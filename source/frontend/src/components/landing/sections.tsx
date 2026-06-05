/**
 * Landing v2 — content sections (Manifesto → CTA → Footer).
 *
 * Grouped here for compactness; each section is an exported component
 * so it can be unit-tested in isolation. Copy comes from i18n
 * (`landing.*` keys), with PT-BR canonical and EN/ES translations.
 *
 * Brand phrases ("Beheld by signal.", "Decided by you.", "forever free
 * for developers", "B3H31D", "Ed25519", tier identifiers like
 * "fully_verifiable") stay identical across locales.
 *
 * Bigger sections live in their own files: DaemonSection,
 * RealSessionsSection, Verification (+ FAQ).
 */
import { BrandGlyph, Wordmark } from "@/components/landing/BrandMark";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { InstallBox } from "@/components/landing/InstallBox";
import { PullQuote } from "@/components/landing/PullQuote";
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

// ─────────────────────────────────────────────────────────────────────────
//  01 · Manifesto
// ─────────────────────────────────────────────────────────────────────────

export function Manifesto() {
  const t = useT();
  return (
    <section className="manifesto" id="manifesto">
      <div className="wrap">
        <Eyebrow idx="01">{t("landing.manifesto.eyebrow")}</Eyebrow>
        <div className="mani-split reveal">
          <div className="manifesto__body">
            <p className="manifesto__lead">{t("landing.manifesto.lead")}</p>
            <p>
              {t("landing.manifesto.p2_pre")}
              <b>{t("landing.manifesto.p2_b")}</b>
              {t("landing.manifesto.p2_post")}
            </p>
            <p>
              {t("landing.manifesto.p3_pre")}
              <b>{t("landing.manifesto.p3_b")}</b>
              {t("landing.manifesto.p3_post")}
            </p>
          </div>
          <PullQuote quoteKey="landing.manifesto.quote" attrKey="landing.manifesto.quote_attr" />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  03 · Como funciona — três passos
// ─────────────────────────────────────────────────────────────────────────

export function HowItWorks() {
  const t = useT();
  return (
    <section className="sect--alt">
      <div className="wrap">
        <Eyebrow idx="03">{t("landing.steps.eyebrow")}</Eyebrow>
        <div className="steps reveal">
          <div className="step">
            <p className="step__n">{t("landing.steps.s1.n")}</p>
            <p className="step__cmd">
              <span className="pmt">$</span> beheld init
            </p>
            <p className="step__d">{t("landing.steps.s1.d")}</p>
          </div>
          <div className="step">
            <p className="step__n">{t("landing.steps.s2.n")}</p>
            <p className="step__t">{t("landing.steps.s2.t")}</p>
            <p className="step__d">{t("landing.steps.s2.d")}</p>
          </div>
          <div className="step">
            <p className="step__n">{t("landing.steps.s3.n")}</p>
            <p className="step__cmd">
              <span className="pmt">$</span> beheld snapshot
            </p>
            <p className="step__d">{t("landing.steps.s3.d")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  05 · Claimed vs Demonstrated
// ─────────────────────────────────────────────────────────────────────────

type CvdRow = {
  key: "row1" | "row2" | "row3";
  badge: "ok" | "warn";
  mark: string;
};

const CVD_ROWS: CvdRow[] = [
  { key: "row1", badge: "ok", mark: "✓" },
  { key: "row2", badge: "ok", mark: "✓" },
  { key: "row3", badge: "warn", mark: "⚠" },
];

export function ClaimedVsDemonstrated() {
  const t = useT();
  return (
    <section className="sect--alt">
      <div className="wrap">
        <Eyebrow idx="05">{t("landing.cvd.eyebrow")}</Eyebrow>
        <div className="two-col">
          <h2 className="h-sect">{t("landing.cvd.h2")}</h2>
          <p className="lede">{t("landing.cvd.lede")}</p>
        </div>

        <div className="cvd reveal">
          {CVD_ROWS.map(({ key, badge, mark }) => (
            <div key={key} className={badge === "warn" ? "cvd__row cvd__row--limited" : "cvd__row"}>
              <div className={`cvd__badge cvd__badge--${badge}`}>{mark}</div>
              <div>
                <p className="cvd__claim">{t(`landing.cvd.${key}.claim` as TKey)}</p>
                <p className="cvd__ev">
                  <span className={badge === "warn" ? "pin-warn" : "pin-ok"}>
                    {t(`landing.cvd.${key}.st` as TKey)}
                  </span>{" "}
                  {t(`landing.cvd.${key}.ev` as TKey)}
                </p>
              </div>
            </div>
          ))}
          <div className="cvd__row cvd__row--limited">
            <div className="cvd__badge cvd__badge--null">○</div>
            <div>
              <p className="cvd__claim">
                {t("landing.cvd.row4.claim")} <span className="tag">{t("landing.cvd.row4.tag")}</span>
              </p>
              <p className="cvd__ev">{t("landing.cvd.row4.ev")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  07 · Cenas reais
// ─────────────────────────────────────────────────────────────────────────

const SCENES = ["s1", "s2", "s3", "s4"] as const;

export function Scenes() {
  const t = useT();
  return (
    <section className="sect--alt">
      <div className="wrap">
        <Eyebrow idx="07">{t("landing.scenes.eyebrow")}</Eyebrow>
        <div className="scenes scenes--grid reveal">
          {SCENES.map((id) => (
            <div key={id} className="scene">
              <p className="scene__s">{t(`landing.scenes.${id}.h` as TKey)}</p>
              <p className="scene__r">
                <span className="ar">→</span> {t(`landing.scenes.${id}.p` as TKey)}
              </p>
            </div>
          ))}
          <div className="scene scene--final">
            <p className="scene__s">{t("landing.scenes.s5.h")}</p>
            <p className="scene__r">
              <span className="ar">→</span> {t("landing.scenes.s5.p")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  CTA band
// ─────────────────────────────────────────────────────────────────────────

export function CTABand() {
  const t = useT();
  const sig = t("landing.hero.h1_sig"); // "Beheld" — brand, identical across locales
  return (
    <section className="cta-band">
      <div className="wrap">
        <h2 className="cta-band__h">
          <span className="b">{sig.charAt(0)}</span>
          {sig.slice(1)}
          {t("landing.hero.h1_rest")}
          <br />
          {t("landing.hero.h1_line2")}
        </h2>
        <InstallBox />
        <p className="cta-band__free">{t("landing.cta.free")}</p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Footer
// ─────────────────────────────────────────────────────────────────────────

export function LandingFooter() {
  const t = useT();
  return (
    <footer className="site-foot">
      <div className="wrap site-foot__grid">
        <div>
          <span className="site-foot__brand">
            <BrandGlyph size={22} />
            <Wordmark />
          </span>
          <p className="fm fm--tag">{t("landing.footer.tagline")}</p>
        </div>
        <div className="site-foot__right">
          <p className="fm">
            <a href="mailto:hi@beheld.dev" style={{ marginLeft: 0 }}>
              hi@beheld.dev
            </a>
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer">
              {t("landing.footer.github")}
            </a>
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer">
              {t("landing.footer.docs")}
            </a>
            <a href="#manifesto">{t("landing.footer.manifesto")}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
