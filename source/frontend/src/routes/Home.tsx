import { useState } from "react";

import { useT } from "@/i18n/I18nProvider";

const INSTALL_CMD = "curl beheld.dev/install | sh";
const GITHUB_URL = "https://github.com/eduardovrocha/beheld";

// ── Logo (lens) — mirrors mock SVG ──────────────────────────────────────────

function LensLogo() {
  return (
    <svg
      viewBox="0 0 240 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="beheld lens logo"
      className="h-16 w-auto"
      style={{ color: "var(--lens)" }}
    >
      <g stroke="currentColor" strokeWidth={1} opacity={0.35} strokeLinecap="round">
        <line x1="16" y1="50" x2="28" y2="50" />
        <line x1="212" y1="50" x2="224" y2="50" />
      </g>
      <path d="M 60 24 Q 40 50 60 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M 180 24 Q 200 50 180 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <line x1="66" y1="50" x2="174" y2="50" stroke="currentColor" strokeWidth={1} strokeDasharray="2 6" opacity={0.45} />
      <circle cx="120" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="120" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}

// ── Reusable bits ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono uppercase"
      style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
    >
      {children}
    </span>
  );
}

function SectionHead({
  num,
  title,
  emTail,
  right,
}: {
  num: string;
  title: string;
  emTail?: string;
  right?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-baseline gap-6">
      <span
        className="font-mono uppercase"
        style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
      >
        {num}
      </span>
      <h2
        className="font-semibold"
        style={{ color: "var(--text)", fontSize: 22, letterSpacing: "-0.02em" }}
      >
        {title}
        {emTail ? (
          <span style={{ color: "var(--muted)", fontWeight: 400 }}> {emTail}</span>
        ) : null}
      </h2>
      {right ? (
        <span
          className="ml-auto font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}
        >
          {right}
        </span>
      ) : null}
    </div>
  );
}

// ── Terminal demo (mirrors mock right column of hero) ───────────────────────

function TerminalDemo() {
  const t = useT();
  return (
    <div
      className="overflow-hidden rounded-md font-mono"
      style={{
        background: "var(--term-bg)",
        border: "1px solid var(--term-rule)",
        color: "var(--term-text)",
        fontSize: 11.5,
        lineHeight: 1.5,
        boxShadow: "0 12px 28px -16px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-center gap-3.5 px-3.5 py-2.5"
        style={{ background: "var(--term-bar-tint)", borderBottom: "1px solid var(--term-rule)" }}
      >
        <div className="flex gap-1.5">
          {/* macOS traffic-light dots stay fixed across themes */}
          <span className="block size-2.5 rounded-full" style={{ background: "#ed6b5b" }} />
          <span className="block size-2.5 rounded-full" style={{ background: "#dab451" }} />
          <span className="block size-2.5 rounded-full" style={{ background: "#5fb47f" }} />
        </div>
        <span
          className="font-mono uppercase"
          style={{ color: "var(--term-muted)", fontSize: 10, letterSpacing: "0.12em" }}
        >
          ~/projects · beheld view --snapshot
        </span>
      </div>

      <div className="px-4 pb-5 pt-4">
        <span className="mb-3.5 block" style={{ color: "var(--term-text)" }}>
          <span style={{ color: "var(--term-prompt)" }}>$</span> beheld view --snapshot
        </span>

        <div
          className="mb-2 mt-3.5 font-mono uppercase"
          style={{ color: "var(--term-muted)", fontSize: 10, letterSpacing: "0.12em" }}
        >
          {t("home.term.observed")}
        </div>
        <TermBar label="stack ratio (py/ts)" pct={87} value="87%" />
        <TermBar label="test ratio" pct={38} value="38%" />
        <TermBar label="react ratio" pct={2} value="2%" />

        <div className="my-2.5 border-t border-dashed" style={{ borderColor: "var(--term-rule)" }} />

        <TermSummary k={t("home.term.sessions_90d")} v="87" delta={t("home.term.sessions_delta")} />
        <TermSummary k={t("home.term.trajectory")} v={t("home.term.trajectory_value")} delta={t("home.term.trajectory_delta")} />

        <div className="mt-3" style={{ color: "var(--term-muted)", fontSize: 10.5 }}>
          {t("home.term.footnote")}
        </div>
      </div>
    </div>
  );
}

// Score-band thresholds — same cutoffs the backend badge uses.
//   < 34   → low     red-ish (signal fraco / valor baixo)
//   34–66  → med     amber (sinal médio)
//   ≥ 67   → high    green (sinal forte / valor alto)
// `tone` opcional sobrescreve a derivação automática.
function pctTone(pct: number): "low" | "med" | "high" {
  if (pct < 34) return "low";
  if (pct < 67) return "med";
  return "high";
}

function TermBar({
  label,
  pct,
  value,
  tone,
}: {
  label: string;
  pct: number;
  value: string;
  tone?: "low" | "med" | "high";
}) {
  const band = tone ?? pctTone(pct);
  const fill =
    band === "low" ? "var(--term-band-low)"
    : band === "med" ? "var(--term-band-med)"
    : "var(--term-band-high)";
  return (
    <div
      className="grid items-center gap-2.5 py-0.5"
      style={{ gridTemplateColumns: "1fr 90px 30px" }}
    >
      <span style={{ color: "var(--term-key)" }}>{label}</span>
      <span className="relative block h-2 overflow-hidden" style={{ background: "var(--term-bar-bg)" }}>
        <span className="block h-full" style={{ width: `${pct}%`, background: fill }} />
      </span>
      <span className="text-right tabular-nums" style={{ color: "var(--term-text)" }}>
        {value}
      </span>
    </div>
  );
}

function TermSummary({ k, v, delta }: { k: string; v: string; delta?: string }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="font-medium" style={{ color: "var(--term-key)" }}>
        {k}
      </span>
      <span className="tabular-nums" style={{ color: "var(--term-text)" }}>
        {v}
        {delta ? (
          <span className="ml-2" style={{ color: "var(--term-ok)" }}>
            {delta}
          </span>
        ) : null}
      </span>
    </div>
  );
}

// ── Install block (hero left column) ────────────────────────────────────────

function InstallBlock() {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <>
      <div
        className="mb-3.5 p-5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
      >
        <div
          className="mb-2.5 font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
        >
          {t("home.install.label")}
        </div>
        <div className="flex items-center gap-2.5 font-mono" style={{ color: "var(--text)", fontSize: 13 }}>
          <span className="font-medium" style={{ color: "var(--accent)" }}>
            $
          </span>
          <span>{INSTALL_CMD}</span>
          <button
            type="button"
            onClick={onCopy}
            className="ml-auto cursor-pointer font-mono uppercase transition-colors"
            style={{
              border: `1px solid ${copied ? "var(--ok)" : "var(--rule)"}`,
              color: copied ? "var(--ok)" : "var(--muted)",
              padding: "5px 11px",
              fontSize: 10,
              letterSpacing: "0.14em",
              background: "transparent",
            }}
          >
            {copied ? t("home.install.copied") : t("home.install.copy")}
          </button>
        </div>
      </div>
      <div
        className="mb-6 font-mono"
        style={{ color: "var(--muted-soft)", fontSize: 10, letterSpacing: "0.08em" }}
      >
        {t("home.install.platforms")}
      </div>

      <div className="inline-flex items-center gap-2">
        <span
          className="font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}
        >
          {t("home.install.product")}
        </span>
        <span style={{ color: "var(--rule)" }}>·</span>
        <span
          className="font-mono uppercase"
          style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.14em" }}
        >
          {t("home.forever_free")}
        </span>
      </div>
    </>
  );
}

// ── Glance cards (section 01) ───────────────────────────────────────────────

function GlanceCard({
  label,
  num,
  note,
  numColor,
}: {
  label: string;
  num: string;
  note: React.ReactNode;
  numColor?: string;
}) {
  return (
    <div
      className="p-6"
      style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
    >
      <div
        className="mb-3.5 font-mono uppercase"
        style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
      >
        {label}
      </div>
      <div
        className="mb-1.5 font-semibold"
        style={{
          color: numColor ?? "var(--text)",
          fontSize: 24,
          letterSpacing: "-0.025em",
          lineHeight: 1,
        }}
      >
        {num}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.65 }}>{note}</div>
    </div>
  );
}

// ── Claim row (section 02) ──────────────────────────────────────────────────

function ClaimRow({
  status,
  title,
  role,
  obs,
}: {
  status: "ok" | "warn";
  title: string;
  role: string;
  obs: string;
}) {
  return (
    <div
      className="grid items-start gap-4 px-5 py-4"
      style={{
        gridTemplateColumns: "32px 1fr",
        borderBottom: "1px solid var(--rule-soft)",
      }}
    >
      <div
        className="text-center font-mono"
        style={{ color: status === "ok" ? "var(--ok)" : "var(--warn)", fontSize: 14, lineHeight: 1.9 }}
      >
        {status === "ok" ? "✓" : "⚠"}
      </div>
      <div>
        <div
          className="font-medium"
          style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.95 }}
        >
          {title}: <span style={{ color: "var(--accent)", fontWeight: 400 }}>{role}</span>
        </div>
        <div className="mt-1" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.95 }}>
          {obs}
        </div>
      </div>
    </div>
  );
}

// ── Signal card (section 03) ────────────────────────────────────────────────

function SignalCard({
  title,
  meta,
  rows,
}: {
  title: string;
  meta: string;
  rows: { key: string; val: React.ReactNode }[];
}) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      <div
        className="flex items-baseline justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <span className="font-semibold" style={{ color: "var(--text)", fontSize: 14 }}>
          {title}
        </span>
        <span
          className="font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.14em" }}
        >
          {meta}
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between px-5 py-2.5"
          style={{ borderBottom: i === rows.length - 1 ? undefined : "1px solid var(--rule-soft)" }}
        >
          <span
            className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10.5, letterSpacing: "0.12em" }}
          >
            {r.key}
          </span>
          <span
            className="text-right font-mono"
            style={{ color: "var(--text)", fontSize: 12 }}
          >
            {r.val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Chain row (section 04) ──────────────────────────────────────────────────

function ChainRow({
  name,
  desc,
  detail,
  last,
}: {
  name: string;
  desc: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <div
      className="grid items-center gap-4 px-5 py-4"
      style={{
        gridTemplateColumns: "32px 1fr 140px",
        borderBottom: last ? undefined : "1px solid var(--rule-soft)",
      }}
    >
      <div
        className="text-center font-mono"
        style={{ color: "var(--ok)", fontSize: 13 }}
      >
        ✓
      </div>
      <div>
        <div className="font-medium" style={{ color: "var(--text)", fontSize: 14 }}>
          {name}
        </div>
        <div className="mt-0.5" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.9 }}>
          {desc}
        </div>
      </div>
      <div
        className="text-right font-mono"
        style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.1em" }}
      >
        {detail}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function Home() {
  const t = useT();
  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
      {/* ═══ DOC HEAD ═══════════════════════════════════════════════════ */}
      <div
        className="mb-12 pb-14 pt-16"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        {/* Canonical logo */}
        <div
          className="mb-14 pb-12 text-center"
          style={{ borderBottom: "1px solid var(--rule-soft)" }}
        >
          <div className="flex flex-col items-center gap-4">
            <LensLogo />
            <div
              className="font-semibold"
              style={{ color: "var(--text)", fontSize: 44, letterSpacing: "-0.025em", lineHeight: 1 }}
            >
              beheld
              <span style={{ color: "var(--accent)", fontWeight: 400 }}>.dev</span>
            </div>
            <div
              className="font-normal uppercase"
              style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
            >
              Beheld by <span style={{ color: "var(--accent)" }}>signal</span>. Decided by{" "}
              <span style={{ color: "var(--accent)" }}>you</span>.
            </div>
          </div>
          <div
            className="mt-6 font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
          >
            {t("home.head.daemon")} <span style={{ color: "var(--accent)" }}>·</span> {t("home.head.real_sessions")}{" "}
            <span style={{ color: "var(--accent)" }}>·</span> {t("home.head.open_source")}
          </div>
        </div>

        {/* Hybrid hero: install + terminal */}
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <InstallBlock />
          </div>
          <TerminalDemo />
        </div>
      </div>

      {/* ═══ LETTER ═════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ borderBottom: "1px solid var(--rule)" }}>
        <Eyebrow>{t("home.letter.eyebrow")}</Eyebrow>
        <div className="mt-5" style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.95 }}>
          {t("home.letter.body_p1")}
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>
            {t("home.letter.body_em")}
          </span>
          {t("home.letter.body_p2")}
        </div>
        <div
          className="mt-6 font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
        >
          {t("home.letter.footnote")}{" "}
          <span style={{ color: "var(--accent)" }}>·</span>{" "}
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>{t("home.forever_free")}</span>
        </div>
      </section>

      {/* ═══ 01 · CAPTURE ═══════════════════════════════════════════════ */}
      <section className="py-16" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="01"
          title={t("home.s01.title")}
          emTail={t("home.s01.em_tail")}
          right={t("home.s01.right")}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlanceCard
            label={t("home.s01.card1.label")}
            num={t("home.s01.card1.num")}
            note={t("home.s01.card1.note")}
          />
          <GlanceCard
            label={t("home.s01.card2.label")}
            num={t("home.s01.card2.num")}
            note={t("home.s01.card2.note")}
          />
          <GlanceCard
            label={t("home.s01.card3.label")}
            num={t("home.s01.card3.num")}
            note={
              <>
                <strong style={{ color: "var(--accent)", fontWeight: 500 }}>{t("home.s01.card3.note_em")}</strong>{t("home.s01.card3.note_suffix")}
              </>
            }
          />
          <GlanceCard
            label={t("home.s01.card4.label")}
            num={t("home.s01.card4.num")}
            numColor="var(--ok)"
            note={
              <>
                {t("home.s01.card4.note_prefix")}
                <strong style={{ color: "var(--accent)", fontWeight: 500 }}>{t("home.s01.card4.note_em")}</strong>
              </>
            }
          />
        </div>
      </section>

      {/* ═══ 02 · CLAIMED vs DEMONSTRATED ═══════════════════════════════ */}
      <section className="py-16" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="02"
          title={t("home.s02.title")}
          emTail={t("home.s02.em_tail")}
          right={t("home.s02.right")}
        />
        <p
          className="mb-7"
          style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.9 }}
        >
          {t("home.s02.intro_p1")}
          <strong style={{ color: "var(--text)", fontWeight: 500 }}>
            {t("home.s02.intro_em")}
          </strong>
          {t("home.s02.intro_p2")}
        </p>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
          <ClaimRow
            status="ok"
            title={t("home.s02.claim1.title")}
            role={t("home.s02.claim1.role")}
            obs={t("home.s02.claim1.obs")}
          />
          <ClaimRow
            status="ok"
            title={t("home.s02.claim2.title")}
            role={t("home.s02.claim2.role")}
            obs={t("home.s02.claim2.obs")}
          />
          <ClaimRow
            status="warn"
            title={t("home.s02.claim3.title")}
            role={t("home.s02.claim3.role")}
            obs={t("home.s02.claim3.obs")}
          />
        </div>

        <div
          className="mt-4 p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
        >
          <div
            className="mb-4 font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em" }}
          >
            {t("home.s02.self_declared_label")}
          </div>
          <div className="mb-4 grid gap-5 sm:grid-cols-2">
            <div>
              <div
                className="mb-1.5 font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
              >
                {t("home.s02.employment_label")}
              </div>
              <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.95 }}>
                {t("home.s02.employment_l1")}
                <br />
                {t("home.s02.employment_l2")}
              </div>
            </div>
            <div>
              <div
                className="mb-1.5 font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
              >
                {t("home.s02.education_label")}
              </div>
              <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.95 }}>
                {t("home.s02.education_l1")}
                <br />
                {t("home.s02.education_l2")}
              </div>
            </div>
          </div>
          <div
            className="pt-3.5"
            style={{
              color: "var(--muted-soft)",
              fontSize: 12,
              lineHeight: 1.75,
              borderTop: "1px solid var(--rule-soft)",
            }}
          >
            {t("home.s02.self_declared_note")}
          </div>
        </div>
      </section>

      {/* ═══ 03 · HOW IT WORKS ══════════════════════════════════════════ */}
      <section className="py-16" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="03"
          title={t("home.s03.title")}
          emTail={t("home.s03.em_tail")}
          right={t("home.s03.right")}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard
            title={t("home.s03.card1.title")}
            meta={t("home.s03.card1.meta")}
            rows={[
              {
                key: t("home.s03.card1.row1_key"),
                val: (
                  <>
                    <span style={{ color: "var(--accent)", fontWeight: 500 }}>$</span> beheld init
                  </>
                ),
              },
              { key: t("home.s03.card1.row2_key"), val: <>{t("home.s03.card1.row2_val")}</> },
              { key: t("home.s03.card1.row3_key"), val: <>{t("home.s03.card1.row3_val")}</> },
              { key: t("home.s03.card1.row4_key"), val: <>{t("home.s03.card1.row4_val")}</> },
            ]}
          />
          <SignalCard
            title={t("home.s03.card2.title")}
            meta={t("home.s03.card2.meta")}
            rows={[
              { key: t("home.s03.card2.row1_key"), val: <>{t("home.s03.card2.row1_val")}</> },
              {
                key: t("home.s03.card2.row2_key"),
                val: <span style={{ color: "var(--accent)" }}>{t("home.s03.card2.row2_val")}</span>,
              },
              {
                key: t("home.s03.card2.row3_key"),
                val: (
                  <>
                    <span style={{ color: "var(--accent)", fontWeight: 500 }}>$</span> beheld snapshot
                  </>
                ),
              },
              { key: t("home.s03.card2.row4_key"), val: <>{t("home.s03.card2.row4_val")}</> },
            ]}
          />
        </div>
      </section>

      {/* ═══ 04 · VERIFICATION CHAIN ════════════════════════════════════ */}
      <section className="py-16">
        <SectionHead
          num="04"
          title={t("home.s04.title")}
          emTail={t("home.s04.em_tail")}
          right={t("home.s04.right")}
        />
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
          <ChainRow
            name={t("home.s04.chain1.name")}
            desc={t("home.s04.chain1.desc")}
            detail="signature_only"
          />
          <ChainRow
            name={t("home.s04.chain2.name")}
            desc={t("home.s04.chain2.desc")}
            detail="chain_intact"
          />
          <ChainRow
            name={t("home.s04.chain3.name")}
            desc={t("home.s04.chain3.desc")}
            detail="identity_verified"
          />
          <ChainRow
            name={t("home.s04.chain4.name")}
            desc={t("home.s04.chain4.desc")}
            detail="engine_verified"
          />
          <ChainRow
            name={t("home.s04.chain5.name")}
            desc={t("home.s04.chain5.desc")}
            detail="fully_verifiable"
            last
          />
        </div>
      </section>

      {/* ═══ FOOTER ═════════════════════════════════════════════════════ */}
      <footer
        className="mt-6 grid items-end gap-8 py-16 sm:grid-cols-2"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <div className="font-mono" style={{ color: "var(--text)", fontSize: 13 }}>
          <span style={{ color: "var(--accent)" }}>$</span> {INSTALL_CMD}
        </div>
        <div
          className="text-right font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", lineHeight: 2 }}
        >
          <div style={{ color: "var(--accent)", fontWeight: 500 }}>{t("home.forever_free")}</div>
          <div className="space-x-1">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              style={{ color: "var(--muted)" }}
            >
              GitHub
            </a>
            <span>·</span>
            <a href="#" className="hover:underline" style={{ color: "var(--muted)" }}>
              {t("home.footer.docs")}
            </a>
            <span>·</span>
            <a href="#" className="hover:underline" style={{ color: "var(--muted)" }}>
              {t("home.footer.manifesto")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
