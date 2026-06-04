/**
 * Landing v5 — content sections (Manifesto → CTA → Footer).
 *
 * Grouped here for compactness; each section is an exported component
 * so it can be unit-tested in isolation. Copy comes from i18n
 * (`landing.*` keys), with PT-BR canonical and EN/ES translations.
 *
 * Brand phrases ("Beheld by signal.", "Decided by you.", "forever
 * free for developers", "B3H31D", "Ed25519", "L1", "L2", tier
 * identifiers like "fully_verifiable") stay identical across locales.
 *
 * The components do NOT include the surrounding `.wrap` — the Home
 * route owns one `<main class="landing-v5 wrap">` that wraps them all.
 */
import { useRef, type ReactNode } from "react";

import { InstallLine } from "@/components/landing/InstallLine";
import { LensMark } from "@/components/LensMark";
import { Section } from "@/components/landing/Section";
import { useRevealMany } from "@/hooks/useReveal";
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

// ─────────────────────────────────────────────────────────────────────────
//  Manifesto · "Além do currículo"
// ─────────────────────────────────────────────────────────────────────────

export function Manifesto() {
  const t = useT();
  return (
    <Section title={t("landing.manifesto.title")}>
      <p className="manifesto reveal d1">
        {t("landing.manifesto.body1")}
        <b>{t("landing.manifesto.body_em")}</b>
        {t("landing.manifesto.body2")}
        <span className="punch">{t("landing.manifesto.punch")}</span>
      </p>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  01 · O que o daemon captura
// ─────────────────────────────────────────────────────────────────────────

type CardKey = "daemon" | "sinais" | "bundle" | "cost";
const CARDS: CardKey[] = ["daemon", "sinais", "bundle", "cost"];

export function CaptureCards() {
  const t = useT();
  return (
    <Section
      id="captura"
      num="01"
      title={t("landing.cap.title")}
      aside={t("landing.cap.aside")}
    >
      <div className="cap">
        {CARDS.map((c, i) => (
          <div key={c} className={`capcard reveal d${(i % 4) + 1}`}>
            <div className="k">{t(`landing.cap.${c}.k` as TKey)}</div>
            <div className="big">{t(`landing.cap.${c}.big` as TKey)}</div>
            <p>{t(`landing.cap.${c}.p` as TKey)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  O que o Beheld não faz
// ─────────────────────────────────────────────────────────────────────────

type NotKey = "cloud" | "code" | "score" | "tell" | "charge" | "lockin";
const NOTS: NotKey[] = ["cloud", "code", "score", "tell", "charge", "lockin"];

export function NotDoingList() {
  const t = useT();
  return (
    <Section
      id="nao"
      num="✗"
      title={t("landing.not.title")}
      aside={t("landing.not.aside")}
    >
      <div className="nots">
        {NOTS.map((n, i) => (
          <div key={n} className={`notrow reveal d${Math.floor(i / 2) + 1}`}>
            <span className="x">✗</span>
            <div>
              <b>{t(`landing.not.${n}.t` as TKey)}</b>
              <p>{t(`landing.not.${n}.b` as TKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  02 · Claimed vs Demonstrated
// ─────────────────────────────────────────────────────────────────────────

export function ClaimedVsDemonstrated() {
  const t = useT();
  return (
    <Section
      num="02"
      title={t("landing.cvd.title")}
      aside={t("landing.cvd.aside")}
    >
      <p className="cvd-intro reveal d1">{t("landing.cvd.intro")}</p>

      <div className="delta">
        <div className="drow ok reveal d1">
          <span className="mk">✓</span>
          <div>
            <div className="claim">{t("landing.cvd.row1.claim")}</div>
            <div className="proof">
              <span className="st">{t("landing.cvd.row1.st")}</span>{" "}
              {t("landing.cvd.row1.proof")}
            </div>
          </div>
        </div>
        <div className="drow ok reveal d2">
          <span className="mk">✓</span>
          <div>
            <div className="claim">{t("landing.cvd.row2.claim")}</div>
            <div className="proof">
              <span className="st">{t("landing.cvd.row2.st")}</span>{" "}
              {t("landing.cvd.row2.proof")}
            </div>
          </div>
        </div>
        <div className="drow warn reveal d3">
          <span className="mk">⚠</span>
          <div>
            <div className="claim">{t("landing.cvd.row3.claim")}</div>
            <div className="proof">
              <span className="st">{t("landing.cvd.row3.st")}</span>{" "}
              {t("landing.cvd.row3.proof")}
            </div>
          </div>
        </div>
      </div>

      <div className="drow self reveal d2">
        <span className="mk">○</span>
        <div>
          <div className="claim">{t("landing.cvd.self.claim")}</div>
          <div className="proof">
            <div className="sdgrid">
              <div className="sdg">
                <div className="l">{t("landing.cvd.self.emp_label")}</div>
                <div className="v">
                  {t("landing.cvd.self.emp_a")}{" "}
                  <span>{t("landing.cvd.self.emp_a_years")}</span>
                  {t("landing.cvd.self.emp_b")}{" "}
                  <span>{t("landing.cvd.self.emp_b_years")}</span>
                </div>
              </div>
              <div className="sdg">
                <div className="l">{t("landing.cvd.self.formation_label")}</div>
                <div className="v">
                  {t("landing.cvd.self.formation_a")}{" "}
                  <span>{t("landing.cvd.self.formation_a_years")}</span>
                </div>
              </div>
            </div>
            <div className="sdnote">{t("landing.cvd.self.note")}</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  03 · Como funciona — três passos
// ─────────────────────────────────────────────────────────────────────────

export function HowItWorksSteps() {
  const t = useT();
  return (
    <Section
      id="como"
      num="03"
      title={t("landing.how.title")}
      aside={t("landing.how.aside")}
    >
      <div className="steps">
        <div className="step reveal d1">
          <div className="sk">{t("landing.how.s1.sk")}</div>
          <h3>{t("landing.how.s1.h")}</h3>
          <div className="cmd">
            <span className="pr">$</span> beheld init
          </div>
          <div className="sub">
            <div className="si">
              <b>Daemon</b> — {t("landing.how.s1.daemon")}
            </div>
            <div className="si">
              <b>Ed25519</b> — {t("landing.how.s1.key")}
            </div>
            <div className="si">
              <b>L1</b> — {t("landing.how.s1.l1")}
            </div>
          </div>
        </div>

        <div className="step reveal d2">
          <div className="sk">{t("landing.how.s2.sk")}</div>
          <h3>{t("landing.how.s2.h")}</h3>
          <div className="sub" style={{ marginTop: 0 }}>
            <div className="si">
              <b>L2</b> — {t("landing.how.s2.obs")}
            </div>
            <div className="si">
              <b>0 bytes</b> — {t("landing.how.s2.content")}
            </div>
          </div>
        </div>

        <div className="step reveal d3">
          <div className="sk">{t("landing.how.s3.sk")}</div>
          <h3>{t("landing.how.s3.h")}</h3>
          <div className="cmd">
            <span className="pr">$</span> beheld snapshot
          </div>
          <div className="sub">
            <div className="si">
              <b>URL</b> — {t("landing.how.s3.result")}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  04 · Cadeia de verificação — cinco camadas (cascade ✓)
// ─────────────────────────────────────────────────────────────────────────

type ChainKey = "l1" | "l2" | "l3" | "l4" | "l5";
const CHAIN_KEYS: ChainKey[] = ["l1", "l2", "l3", "l4", "l5"];
const CHAIN_TIERS: Record<ChainKey, string> = {
  l1: "signature_only",
  l2: "chain_intact",
  l3: "identity_verified",
  l4: "engine_verified",
  l5: "fully_verifiable",
};

export function VerificationChain() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  useRevealMany<HTMLDivElement>(".clayer", { threshold: 0.3 });

  return (
    <Section num="04" title={t("landing.chain.title")}>
      <div className="chain-tier reveal d1">{t("landing.chain.tier_intro")}</div>
      <div className="chain" ref={containerRef}>
        {CHAIN_KEYS.map((k, i) => (
          <div
            key={k}
            className="clayer"
            style={{ transitionDelay: `${i * 0.26}s` }}
          >
            <span className="ck">✓</span>
            <div className="cc">
              <b>{t(`landing.chain.${k}.t` as TKey)}</b>
              <p>{t(`landing.chain.${k}.b` as TKey)}</p>
            </div>
            <span className="tier">{CHAIN_TIERS[k]}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  FAQ — accordion, one open at a time
// ─────────────────────────────────────────────────────────────────────────

const FAQ_IDS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;

export function FAQ() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);

  function handleToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const opened = e.currentTarget;
    if (!opened.open) return;
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLDetailsElement>("details.qa").forEach((d) => {
      if (d !== opened) d.open = false;
    });
  }

  return (
    <Section
      num="?"
      title={t("landing.faq.title")}
      aside={t("landing.faq.aside")}
    >
      <div className="faq" ref={containerRef}>
        {FAQ_IDS.map((id, i) => (
          <details
            key={id}
            className={`qa reveal d${Math.min(4, Math.floor(i / 2) + 1)}`}
            onToggle={handleToggle}
          >
            <summary className="q">
              <span className="pl">+</span> {t(`landing.faq.${id}` as TKey)}
            </summary>
            <div className="a">{t(`landing.faq.a${id.slice(1)}` as TKey)}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Cenas reais
// ─────────────────────────────────────────────────────────────────────────

const SCENES = ["s1", "s2", "s3", "s4", "s5"] as const;

export function RealScenes() {
  const t = useT();
  return (
    <Section
      title={t("landing.scenes.title")}
      aside={t("landing.scenes.aside")}
    >
      <div className="cenas">
        {SCENES.map((id, i) => (
          <div key={id} className={`cena reveal d${Math.min(3, Math.floor(i / 2) + 1)}`}>
            <div className="ch">{t(`landing.scenes.${id}.h` as TKey)}</div>
            <div className="cp">
              <span className="arrow">→</span>{" "}
              {t(`landing.scenes.${id}.p` as TKey) as ReactNode}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  CTA
// ─────────────────────────────────────────────────────────────────────────

export function CTASection() {
  const t = useT();
  return (
    <section className="cta" id="cta">
      <InstallLine className="reveal d1" />
      <div className="free reveal d2">{t("landing.cta.free")}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Footer
// ─────────────────────────────────────────────────────────────────────────

export function LandingFooter() {
  const t = useT();
  return (
    <footer className="footer wrap">
      <div className="fmark">
        <LensMark size={16} />
        <span>{t("landing.footer.tagline")}</span>
      </div>
      <div className="flinks">
        <a className="mail" href="mailto:hi@beheld.dev">hi@beheld.dev</a>
        <a href="https://github.com/" target="_blank" rel="noopener noreferrer">
          {t("landing.footer.github")}
        </a>
      </div>
    </footer>
  );
}
