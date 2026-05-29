/**
 * ProfileCard — public profile page (rota `/v/:id` + drop-in em `/verify`).
 *
 * Visual: porta do mock beheld-dev-profile-page-v2 (estilo "doc" com paleta
 * bege/dourada + seções numeradas + letter prose + chain de verificação).
 *
 * Dados: o que existir no Bundle real é renderizado; o que não existir é
 * omitido (não usar dados fake). Seção "Claimed vs Demonstrated" do mock
 * fica fora porque o bundle ainda não expõe self-declared fields.
 */
import type { Bundle, BundleL1Section, BundleL2Section, BundlePayloadV1 } from "@/lib/types";
import type { AttestationCheck } from "@/lib/attestationVerify";
import type { VerifyResult } from "@/lib/verify";
import { useT, useFmt } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";
import type { Formatters } from "@/i18n/format";

interface Props {
  bundle: Bundle;
  result: VerifyResult | null;
  verifying: boolean;
  shortId?: string | null;
  banner?: React.ReactNode;
  attestation?: AttestationCheck | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatNumber(fmt: Formatters, n: number): string {
  return fmt.number(n);
}

function formatIsoDate(iso: string | null | undefined): string {
  const d = parseIso(iso ?? null);
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function formatIsoZ(iso: string | null | undefined): string {
  const d = parseIso(iso ?? null);
  if (!d) return "—";
  return d.toISOString().slice(0, 19) + "Z";
}

function readSections(bundle: Bundle): {
  l1: BundleL1Section | null;
  l2: BundleL2Section | null;
} {
  const p = bundle.payload as unknown as Bundle["payload"] & Partial<BundlePayloadV1>;
  return {
    l1: (p.l1 as BundleL1Section | undefined) ?? null,
    l2: ((p.l2 ?? p.signals) as BundleL2Section | undefined) ?? null,
  };
}

const WORKFLOW_LABEL: Record<string, string> = {
  tdd: "TDD",
  "test-after": "Test-after",
  test_after: "Test-after",
  "test-first": "TDD",
  test_first: "TDD",
  "debug-driven": "Debug-driven",
  debug_driven: "Debug-driven",
  exploration: "Exploratory",
  exploratory: "Exploratory",
  "feature-work": "Feature work",
  feature_work: "Feature work",
  refactor: "Refactor",
};

function humanizeWorkflow(k: string): string {
  return WORKFLOW_LABEL[k] ?? k;
}

function topEntries(record: Record<string, number> | undefined, limit = 6): [string, number][] {
  if (!record) return [];
  return Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function trueKeys(record: Record<string, boolean> | undefined): string[] {
  if (!record) return [];
  return Object.entries(record).filter(([, v]) => v).map(([k]) => k);
}

type Tier = "fully_verifiable" | "signed_only" | "incomplete" | "checking";

function classifyTier(
  verifying: boolean,
  result: VerifyResult | null,
  attestation: AttestationCheck | null | undefined,
): Tier {
  if (verifying) return "checking";
  if (!result?.ok) return "incomplete";
  if (
    attestation?.present &&
    attestation.payload_valid &&
    attestation.signature_valid &&
    attestation.dev_pubkey_matches &&
    (attestation.key_status === "active" || attestation.key_status === "rotated")
  ) {
    return "fully_verifiable";
  }
  return "signed_only";
}

function tierLabelKey(tier: Tier): TKey {
  switch (tier) {
    case "fully_verifiable":
      return "profile.tier.fully_verifiable";
    case "signed_only":
      return "profile.tier.signed_only";
    case "incomplete":
      return "profile.tier.incomplete";
    case "checking":
      return "profile.tier.checking";
  }
}

function shortFingerprint(signature: string): string {
  // signature is "ed25519:<128 hex>" — take first 4 + last 4
  const hex = signature.replace(/^ed25519:/, "");
  if (hex.length < 12) return hex;
  return `${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

// ── Lens logo (canon) ────────────────────────────────────────────────────────

function LensLogo({ size = 72 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 240 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="beheld lens logo"
      style={{ color: "var(--lens)", height: size, width: "auto" }}
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

// ── Section head (numbered) ──────────────────────────────────────────────────

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

// ── Glance card (Section 01) ─────────────────────────────────────────────────

function GlanceCard({
  label,
  num,
  suffix,
  note,
}: {
  label: string;
  num: string;
  suffix?: string;
  note: React.ReactNode;
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
        style={{ color: "var(--text)", fontSize: 32, letterSpacing: "-0.025em", lineHeight: 1 }}
      >
        {num}
        {suffix ? (
          <span
            className="ml-1"
            style={{ color: "var(--muted)", fontSize: 18, fontWeight: 400 }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.65 }}>{note}</div>
    </div>
  );
}

// ── Signal card (Section 02 — L1/L2 detail) ──────────────────────────────────

function SignalCard({
  title,
  meta,
  rows,
}: {
  title: string;
  meta: string;
  rows: { key: string; val: React.ReactNode; accent?: boolean }[];
}) {
  return (
    <div
      style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
    >
      <div
        className="flex items-baseline justify-between px-6 py-4"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--rule)" }}
      >
        <span className="font-semibold" style={{ color: "var(--text)", fontSize: 15 }}>
          {title}
        </span>
        <span
          className="font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}
        >
          {meta}
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-6 py-3"
          style={{
            borderBottom: i === rows.length - 1 ? undefined : "1px dashed var(--rule-soft)",
            fontSize: 13.5,
          }}
        >
          <span style={{ color: "var(--muted)" }}>{r.key}</span>
          <span
            className="text-right font-mono"
            style={{
              color: r.accent ? "var(--accent)" : "var(--text)",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {r.val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Quality row (Section 03) ─────────────────────────────────────────────────

function QualityRow({ qk, qv }: { qk: string; qv: React.ReactNode }) {
  return (
    <div
      className="grid gap-6 py-3"
      style={{
        gridTemplateColumns: "200px 1fr",
        borderBottom: "1px dashed var(--rule-soft)",
        fontSize: 13.5,
      }}
    >
      <span
        className="font-mono uppercase"
        style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
      >
        {qk}
      </span>
      <span style={{ color: "var(--text)", lineHeight: 1.75 }}>{qv}</span>
    </div>
  );
}

// ── Chain row (Section 04) ───────────────────────────────────────────────────

function ChainRow({
  ok,
  name,
  desc,
  detail,
  detailValue,
  last,
}: {
  ok: boolean;
  name: string;
  desc: string;
  detail?: string;
  detailValue?: string;
  last?: boolean;
}) {
  return (
    <div
      className="grid items-center gap-5 px-7 py-4"
      style={{
        gridTemplateColumns: "28px 1fr auto",
        borderBottom: last ? undefined : "1px solid var(--rule-soft)",
      }}
    >
      <div
        className="font-mono"
        style={{ color: ok ? "var(--ok)" : "var(--warn)", fontSize: 16 }}
      >
        {ok ? "✓" : "✗"}
      </div>
      <div>
        <div className="font-semibold" style={{ color: "var(--text)", fontSize: 14 }}>
          {name}
        </div>
        <div className="mt-0.5" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.75 }}>
          {desc}
        </div>
      </div>
      <div
        className="text-right font-mono"
        style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.04em" }}
      >
        {detailValue ? (
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>{detailValue}</span>
        ) : null}
        {detail ? (
          <>
            {detailValue ? <br /> : null}
            {detail}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Main render ──────────────────────────────────────────────────────────────

export function ProfileCard({
  bundle,
  result,
  verifying,
  shortId,
  banner,
  attestation,
}: Props) {
  const t = useT();
  const fmt = useFmt();
  const { l1, l2 } = readSections(bundle);
  const github = bundle.attestation?.payload?.github ?? null;
  const tier = classifyTier(verifying, result, attestation);

  // Derived numbers
  const sessions = l2?.sessions_analyzed ?? 0;
  const ecosystemsL1 = l1 ? trueKeys(l1.ecosystems) : [];
  const ecosystemsL2 = l2 ? topEntries(l2.ecosystems, 8).map(([k]) => k) : [];
  const allEcosystems = Array.from(new Set([...ecosystemsL1, ...ecosystemsL2]));
  const testRatioPct = l1 ? Math.round((l1.avg_test_ratio ?? 0) * 100) : 0;
  const periodDays = l2?.period_days ?? 90;
  const totalRepos = l1?.total_repos ?? 0;
  const totalCommits = l1?.total_commits ?? 0;
  const earliestDate = parseIso(l1?.earliest_commit ?? null);
  const latestDate = parseIso(l1?.latest_commit ?? null);
  const earliestYear = earliestDate?.getFullYear();
  const yearsActive = earliestDate ? new Date().getFullYear() - earliestDate.getFullYear() : 0;

  const workflowEntries = topEntries(l2?.workflow_distribution, 4);
  const topWorkflow = workflowEntries[0];
  const topWorkflowPct = topWorkflow ? Math.round(topWorkflow[1] * 100) : 0;

  const sigOk = result?.checks?.signature?.ok ?? false;
  const hashOk = result?.checks?.hash?.ok ?? false;
  const schemaOk = result?.checks?.schema?.ok ?? false;
  const attOk =
    !!attestation?.present &&
    attestation.payload_valid &&
    attestation.signature_valid &&
    (attestation.key_status === "active" || attestation.key_status === "rotated");

  const profileId = shortId ?? bundle.hash.replace(/^sha256:/, "").slice(0, 9);
  const sigFp = shortFingerprint(bundle.signature);

  // Pre-computed strings
  const handle = github?.login ?? "anonymous";
  const observationLine = t("profile.observation_line", {
    date: formatIsoDate(bundle.payload.created_at),
    version: bundle.payload.beheld_version,
    days: periodDays,
  });

  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
      {banner}

      {/* ═══ DOC HEAD ════════════════════════════════════════════════════ */}
      <div
        className="mb-14 pb-16 pt-20 text-center"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div
          className="mb-16 pb-16"
          style={{ borderBottom: "1px solid var(--rule-soft)" }}
        >
          <div className="flex flex-col items-center gap-4">
            <LensLogo size={72} />
            <div
              className="font-semibold"
              style={{ color: "var(--text)", fontSize: 56, letterSpacing: "-0.025em", lineHeight: 1 }}
            >
              beheld
              <span style={{ color: "var(--accent)", fontWeight: 400 }}>.dev</span>
            </div>
            <div
              className="font-normal uppercase"
              style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.14em" }}
            >
              Beheld by <span style={{ color: "var(--accent)" }}>signal</span>. Decided by{" "}
              <span style={{ color: "var(--accent)" }}>you</span>.
            </div>
            <div
              className="mt-1 font-mono"
              style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.08em" }}
            >
              beheld.dev/v/<span>{profileId}</span>
            </div>
          </div>
        </div>

        <div
          className="mb-5 font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.14em" }}
        >
          {attestation?.present && attestation.signature_valid ? (
            <>
              {t("profile.identity.verified")}{" "}
              <span style={{ color: "var(--accent)" }}>·</span>{" "}
              <span style={{ color: "var(--text)", fontWeight: 500 }}>{t("profile.identity.via_github")}</span>
            </>
          ) : (
            <>
              {t("profile.identity.unverified")}{" "}
              <span style={{ color: "var(--warn)" }}>·</span>{" "}
              <span style={{ color: "var(--warn)", fontWeight: 500 }}>{t("profile.identity.no_attestation")}</span>
            </>
          )}
        </div>
        <h1
          className="cmd-cursor mb-3.5 inline-block font-mono"
          style={{
            color: "var(--text)",
            fontSize: "clamp(36px, 5vw, 56px)",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            fontWeight: 500,
          }}
        >
          <span style={{ color: "var(--accent)", fontWeight: 500, marginRight: "0.1em" }}>@</span>
          {handle}
        </h1>
        <div className="mb-8" style={{ color: "var(--muted)", fontSize: 14 }}>
          {observationLine}
        </div>
        <div className="inline-flex items-baseline gap-2">
          <span
            className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
          >
            {t("profile.trust_tier")}
          </span>
          <span style={{ color: "var(--rule)" }}>·</span>
          <span
            className="font-mono uppercase"
            style={{
              color: tier === "incomplete" ? "var(--warn)" : "var(--accent)",
              fontSize: 11,
              letterSpacing: "0.14em",
            }}
          >
            {t(tierLabelKey(tier))}
          </span>
        </div>
      </div>

      {/* ═══ LETTER (auto-generated from real numbers) ═══════════════════ */}
      <section className="py-14" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div
          className="mb-5 font-mono uppercase"
          style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
        >
          {t("profile.letter.eyebrow")}
        </div>
        <div style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.95, maxWidth: 760 }}>
          {t("profile.letter.last_days", { days: periodDays })}
          <strong style={{ color: "var(--accent)", fontWeight: 500 }}>@{handle}</strong>
          {t("profile.letter.worked_in")}
          <span className="font-mono" style={{ color: "var(--text)" }}>
            {formatNumber(fmt, sessions)}
          </span>
          {sessions === 1 ? t("profile.letter.sessions_in.one") : t("profile.letter.sessions_in.other")}
          <span className="font-mono" style={{ color: "var(--text)" }}>
            {allEcosystems.length}
          </span>{" "}
          {allEcosystems.length === 1 ? t("profile.ecosystem.one") : t("profile.ecosystem.other")}.
          {testRatioPct > 0 ? (
            <>
              {t("profile.letter.test_ratio_prefix")}
              <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                {testRatioPct}%
              </span>
              .
            </>
          ) : null}
          {topWorkflow ? (
            <>
              {t("profile.letter.workflow_prefix")}
              <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                {humanizeWorkflow(topWorkflow[0])}
              </span>{" "}
              ({topWorkflowPct}%).
            </>
          ) : null}
          {totalRepos > 0 && earliestYear ? (
            <>
              {t("profile.letter.git_prefix")}
              <span className="font-mono" style={{ color: "var(--text)" }}>
                {formatNumber(fmt, totalCommits)}
              </span>
              {t("profile.letter.git_commits_in")}
              <span className="font-mono" style={{ color: "var(--text)" }}>
                {totalRepos}
              </span>
              {t("profile.letter.git_repos_since")}
              <span className="font-mono" style={{ color: "var(--text)" }}>
                {earliestYear}
              </span>
              .
            </>
          ) : null}
        </div>
        <div
          className="mt-6 font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
        >
          {t("profile.letter.footnote")}{" "}
          <span style={{ color: "var(--accent)" }}>·</span>{" "}
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>{t("profile.letter.signed")}</span>
        </div>
      </section>

      {/* ═══ 01 · VISÃO GERAL ════════════════════════════════════════════ */}
      <section className="py-12" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="01"
          title={t("profile.s01.title")}
          emTail={t("profile.s01.em_tail", { days: periodDays })}
          right={t("profile.s01.right")}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlanceCard
            label={t("profile.s01.sessions_label")}
            num={formatNumber(fmt, sessions)}
            note={
              <>
                {t("profile.s01.sessions_across")}
                <strong style={{ color: "var(--accent)", fontWeight: 500 }}>
                  {allEcosystems.length}
                </strong>{" "}
                {allEcosystems.length === 1 ? t("profile.ecosystem.one") : t("profile.ecosystem.other")}
              </>
            }
          />
          <GlanceCard
            label={t("profile.s01.test_ratio_label")}
            num={String(testRatioPct)}
            suffix="%"
            note={
              testRatioPct >= 30 ? (
                <>
                  <strong style={{ color: "var(--accent)", fontWeight: 500 }}>{t("profile.s01.test_ratio_above_em")}</strong>{t("profile.s01.test_ratio_above_suffix")}
                </>
              ) : (
                <>{t("profile.s01.test_ratio_below")}</>
              )
            }
          />
          <GlanceCard
            label={t("profile.s01.repos_label")}
            num={formatNumber(fmt, totalRepos)}
            note={
              <>
                {formatNumber(fmt, totalCommits)} commits
                {earliestYear ? t("profile.s01.since", { year: earliestYear }) : ""}
              </>
            }
          />
          <GlanceCard
            label={t("profile.s01.workflow_label")}
            num={topWorkflow ? humanizeWorkflow(topWorkflow[0]) : "—"}
            note={
              topWorkflow ? (
                <>
                  {topWorkflowPct}% {t("profile.s01.workflow_sessions")}{" "}
                  <span style={{ color: "var(--muted-soft)" }}>· {t("profile.s01.workflow_dominant")}</span>
                </>
              ) : (
                <>{t("profile.s01.workflow_none")}</>
              )
            }
          />
        </div>
      </section>

      {/* ═══ 02 · SINAIS TÉCNICOS ════════════════════════════════════════ */}
      <section className="py-12" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="02"
          title={t("profile.s02.title")}
          emTail={t("profile.s02.em_tail")}
          right={t("profile.s02.right")}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard
            title={t("profile.s02.l1_title")}
            meta={`${t("profile.s02.base")} · ${totalRepos} ${totalRepos === 1 ? t("profile.repo.one") : t("profile.repo.other")}`}
            rows={[
              { key: t("profile.s02.row.total_commits"), val: formatNumber(fmt, totalCommits) },
              { key: t("profile.s02.row.earliest_commit"), val: formatIsoDate(l1?.earliest_commit) },
              { key: t("profile.s02.row.latest_commit"), val: formatIsoDate(l1?.latest_commit) },
              {
                key: t("profile.s02.row.ecosystems_detected"),
                val: ecosystemsL1.length > 0 ? ecosystemsL1.slice(0, 5).join(" · ") : "—",
              },
              { key: t("profile.s02.row.avg_test_ratio"), val: `${testRatioPct}%`, accent: true },
              {
                key: t("profile.s02.row.activity_window"),
                val:
                  earliestDate && latestDate
                    ? t("profile.s02.years", { years: yearsActive })
                    : "—",
              },
            ]}
          />
          <SignalCard
            title={t("profile.s02.l2_title")}
            meta={t("profile.s02.l2_meta", { days: periodDays })}
            rows={[
              { key: t("profile.s02.row.total_sessions"), val: formatNumber(fmt, sessions) },
              {
                key: t("profile.s02.row.top_workflow"),
                val: topWorkflow
                  ? `${humanizeWorkflow(topWorkflow[0])} · ${topWorkflowPct}%`
                  : "—",
                accent: !!topWorkflow,
              },
              ...workflowEntries.slice(1, 4).map(([k, v]) => ({
                key: humanizeWorkflow(k),
                val: `${Math.round(v * 100)}%`,
              })),
              {
                key: t("profile.s02.row.ecosystems_top"),
                val: ecosystemsL2.length > 0 ? ecosystemsL2.slice(0, 3).join(" · ") : "—",
              },
            ]}
          />
        </div>
      </section>

      {/* ═══ 03 · QUALIDADE DO SINAL ═════════════════════════════════════ */}
      <section className="py-12" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="03"
          title={t("profile.s03.title")}
          emTail={t("profile.s03.em_tail")}
          right={t("profile.s03.right")}
        />
        <div
          className="p-8"
          style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
        >
          <QualityRow
            qk={t("profile.s03.obs_window_label")}
            qv={t("profile.s03.obs_window_value", { days: periodDays })}
          />
          <QualityRow
            qk={t("profile.s03.volume_label")}
            qv={
              <>
                {formatNumber(fmt, sessions)} {t("profile.s03.sessions_word")} · {totalRepos}{" "}
                {totalRepos === 1 ? t("profile.repo.one") : t("profile.repo.other")} ·{" "}
                {sessions >= 30 && totalRepos >= 1 ? (
                  <span style={{ color: "var(--ok)" }}>{t("profile.s03.sufficient")}</span>
                ) : (
                  <span style={{ color: "var(--warn)" }}>{t("profile.s03.below_min")}</span>
                )}{" "}
                <span style={{ color: "var(--muted)" }}>
                  {t("profile.s03.min_note")}
                </span>
              </>
            }
          />
          <QualityRow
            qk={t("profile.s03.schema_label")}
            qv={
              <>
                v{bundle.payload.beheld_version}{" "}
                <span className="font-mono" style={{ color: "var(--muted)" }}>
                  · {schemaOk ? t("profile.s03.schema_valid") : t("profile.s03.schema_warning")}
                </span>
              </>
            }
          />
          <QualityRow
            qk={t("profile.s03.warnings_label")}
            qv={
              result?.warnings && result.warnings.length > 0 ? (
                <span style={{ color: "var(--warn)" }}>
                  {result.warnings.join(" · ")}
                </span>
              ) : (
                <span style={{ color: "var(--ok)" }}>{t("profile.s03.warnings_none")}</span>
              )
            }
          />
          <QualityRow
            qk={t("profile.s03.reliability_label")}
            qv={
              tier === "fully_verifiable"
                ? t("profile.s03.reliability_high")
                : tier === "signed_only"
                ? t("profile.s03.reliability_med")
                : tier === "incomplete"
                ? t("profile.s03.reliability_low")
                : t("profile.s03.reliability_checking")
            }
          />
        </div>
      </section>

      {/* ═══ 04 · CADEIA DE VERIFICAÇÃO ══════════════════════════════════ */}
      <section className="py-12">
        <SectionHead
          num="04"
          title={t("profile.s04.title")}
          emTail={t("profile.s04.em_tail", { tier })}
          right={t(tierLabelKey(tier))}
        />
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
          <ChainRow
            ok={sigOk && hashOk}
            name={t("profile.s04.chain1.name")}
            desc={t("profile.s04.chain1.desc")}
            detail="fingerprint"
            detailValue={sigFp}
          />
          <ChainRow
            ok={true}
            name={t("profile.s04.chain2.name")}
            desc={
              bundle.payload.previous_hash
                ? t("profile.s04.chain2.desc_continuous")
                : t("profile.s04.chain2.desc_genesis")
            }
            detail={bundle.payload.previous_hash ? "continuous" : "genesis"}
            detailValue={
              bundle.payload.previous_hash
                ? bundle.payload.previous_hash.replace(/^sha256:/, "").slice(0, 8) + "…"
                : "—"
            }
          />
          <ChainRow
            ok={attOk}
            name={t("profile.s04.chain3.name")}
            desc={
              attOk
                ? t("profile.s04.chain3.desc_ok", { login: github?.login ?? "" })
                : t("profile.s04.chain3.desc_missing")
            }
            detail={
              attestation?.platform_key_id
                ? `attested · ${attestation.platform_key_id}`
                : undefined
            }
            detailValue={github?.login ? `@${github.login}` : undefined}
          />
          <ChainRow
            ok={true}
            name={t("profile.s04.chain4.name")}
            desc={t("profile.s04.chain4.desc")}
            detail="version"
            detailValue={`v${bundle.payload.beheld_version}`}
            last
          />
        </div>

        <div
          className="mt-5 p-5"
          style={{
            background: "var(--surface)",
            borderLeft: "3px solid var(--accent)",
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.75,
          }}
        >
          <strong style={{ color: "var(--text)", fontWeight: 500 }}>{t("profile.s04.important_label")}</strong>{t("profile.s04.important_body")}
        </div>
      </section>

      {/* ═══ ACTIONS ═════════════════════════════════════════════════════ */}
      <div
        className="mt-10 flex flex-wrap items-center justify-center gap-8 pb-8 pt-12"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <a
          href={`/v/${profileId}`}
          className="font-mono uppercase"
          style={{
            color: "var(--accent)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textDecoration: "none",
          }}
        >
          {t("profile.actions.download")}
        </a>
        <a
          href={`/v/${profileId}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono uppercase"
          style={{
            color: "var(--muted)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textDecoration: "none",
          }}
        >
          {t("profile.actions.view_json")}
        </a>
        <a
          href="https://github.com/eduardovrocha/beheld#verify"
          target="_blank"
          rel="noreferrer"
          className="font-mono uppercase"
          style={{
            color: "var(--muted)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textDecoration: "none",
          }}
        >
          {t("profile.actions.verify_cli")}
        </a>
      </div>

      {/* ═══ DOC FOOT ════════════════════════════════════════════════════ */}
      <div
        className="mt-8 flex flex-wrap items-center justify-between gap-6 pb-20 pt-12"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <LensLogo size={50} />
        <div
          className="text-right font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", lineHeight: 1.7 }}
        >
          <div>
            {t("profile.foot.profile_id")} ·{" "}
            <strong style={{ color: "var(--accent)", fontWeight: 500 }}>{profileId}</strong>
          </div>
          <div>
            {t("profile.foot.bundle_hash")} ·{" "}
            <span className="font-mono" style={{ color: "var(--muted-soft)" }}>
              {bundle.hash.replace(/^sha256:/, "").slice(0, 16)}…
            </span>
          </div>
          <div>
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>
              {t("home.forever_free")}
            </span>
          </div>
        </div>
      </div>

      {/* Last verified timestamp (debug-ish but small) */}
      <div
        className="pb-8 text-center font-mono"
        style={{ color: "var(--muted-soft)", fontSize: 9, letterSpacing: "0.08em" }}
      >
        {t("profile.foot.created_at", { ts: formatIsoZ(bundle.payload.created_at) })}
      </div>
    </div>
  );
}
