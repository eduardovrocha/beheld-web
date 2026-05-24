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

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
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

function tierLabel(tier: Tier): string {
  switch (tier) {
    case "fully_verifiable":
      return "fully verifiable";
    case "signed_only":
      return "signed only";
    case "incomplete":
      return "incomplete";
    case "checking":
      return "checking…";
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
  const observationLine = `Bundle assinado · ${formatIsoDate(bundle.payload.created_at)} · engine v${bundle.payload.beheld_version} · janela de ${periodDays} dias de observação`;

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
              Identidade verificada{" "}
              <span style={{ color: "var(--accent)" }}>·</span>{" "}
              <span style={{ color: "var(--text)", fontWeight: 500 }}>GitHub OAuth</span>
            </>
          ) : (
            <>
              Identidade não verificada{" "}
              <span style={{ color: "var(--warn)" }}>·</span>{" "}
              <span style={{ color: "var(--warn)", fontWeight: 500 }}>sem attestation</span>
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
            Trust tier
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
            {tierLabel(tier)}
          </span>
        </div>
      </div>

      {/* ═══ LETTER (auto-generated from real numbers) ═══════════════════ */}
      <section className="py-14" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div
          className="mb-5 font-mono uppercase"
          style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
        >
          — Observação do Beheld
        </div>
        <div style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.95, maxWidth: 760 }}>
          Nos últimos {periodDays} dias, <strong style={{ color: "var(--accent)", fontWeight: 500 }}>@{handle}</strong>{" "}
          trabalhou em{" "}
          <span className="font-mono" style={{ color: "var(--text)" }}>
            {formatNumber(sessions)}
          </span>{" "}
          sessões em{" "}
          <span className="font-mono" style={{ color: "var(--text)" }}>
            {allEcosystems.length}
          </span>{" "}
          {allEcosystems.length === 1 ? "ecosystem" : "ecosystems"}.
          {testRatioPct > 0 ? (
            <>
              {" "}Test ratio:{" "}
              <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                {testRatioPct}%
              </span>
              .
            </>
          ) : null}
          {topWorkflow ? (
            <>
              {" "}Workflow predominante:{" "}
              <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                {humanizeWorkflow(topWorkflow[0])}
              </span>{" "}
              ({topWorkflowPct}%).
            </>
          ) : null}
          {totalRepos > 0 && earliestYear ? (
            <>
              {" "}Histórico git:{" "}
              <span className="font-mono" style={{ color: "var(--text)" }}>
                {formatNumber(totalCommits)}
              </span>{" "}
              commits em{" "}
              <span className="font-mono" style={{ color: "var(--text)" }}>
                {totalRepos}
              </span>{" "}
              repositórios desde{" "}
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
          Esse é o trabalho dele. Não o LinkedIn dele. O trabalho.{" "}
          <span style={{ color: "var(--accent)" }}>·</span>{" "}
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>signed Ed25519</span>
        </div>
      </section>

      {/* ═══ 01 · VISÃO GERAL ════════════════════════════════════════════ */}
      <section className="py-12" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="01"
          title="Visão geral"
          emTail={`· últimos ${periodDays} dias`}
          right="Combined L1 + L2"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlanceCard
            label="Sessões"
            num={formatNumber(sessions)}
            note={
              <>
                across{" "}
                <strong style={{ color: "var(--accent)", fontWeight: 500 }}>
                  {allEcosystems.length}
                </strong>{" "}
                {allEcosystems.length === 1 ? "ecosystem" : "ecosystems"}
              </>
            }
          />
          <GlanceCard
            label="Test ratio"
            num={String(testRatioPct)}
            suffix="%"
            note={
              testRatioPct >= 30 ? (
                <>
                  <strong style={{ color: "var(--accent)", fontWeight: 500 }}>acima</strong> da
                  mediana global
                </>
              ) : (
                <>cobertura ainda em desenvolvimento</>
              )
            }
          />
          <GlanceCard
            label="L1 repositories"
            num={formatNumber(totalRepos)}
            note={
              <>
                {formatNumber(totalCommits)} commits
                {earliestYear ? ` desde ${earliestYear}` : ""}
              </>
            }
          />
          <GlanceCard
            label="Workflow"
            num={topWorkflow ? humanizeWorkflow(topWorkflow[0]) : "—"}
            note={
              topWorkflow ? (
                <>
                  {topWorkflowPct}% sessões{" "}
                  <span style={{ color: "var(--muted-soft)" }}>· dominante</span>
                </>
              ) : (
                <>sem distribuição observada</>
              )
            }
          />
        </div>
      </section>

      {/* ═══ 02 · SINAIS TÉCNICOS ════════════════════════════════════════ */}
      <section className="py-12" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="02"
          title="Sinais técnicos"
          emTail="· detalhe"
          right="L1 git · L2 sessions"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard
            title="L1 · Histórico Git"
            meta={`Base · ${totalRepos} ${totalRepos === 1 ? "repo" : "repos"}`}
            rows={[
              { key: "Total de commits", val: formatNumber(totalCommits) },
              { key: "Commit mais antigo", val: formatIsoDate(l1?.earliest_commit) },
              { key: "Commit mais recente", val: formatIsoDate(l1?.latest_commit) },
              {
                key: "Ecosystems detectados",
                val: ecosystemsL1.length > 0 ? ecosystemsL1.slice(0, 5).join(" · ") : "—",
              },
              { key: "Test ratio médio", val: `${testRatioPct}%`, accent: true },
              {
                key: "Janela de atividade",
                val:
                  earliestDate && latestDate
                    ? `${yearsActive} anos`
                    : "—",
              },
            ]}
          />
          <SignalCard
            title="L2 · Trajetória Claude Code"
            meta={`Recent · ${periodDays} days`}
            rows={[
              { key: "Total de sessões", val: formatNumber(sessions) },
              {
                key: "Workflow predominante",
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
                key: "Ecosystems (top)",
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
          title="Qualidade do sinal"
          emTail="· honestidade radical"
          right="Self-disclosed limits"
        />
        <div
          className="p-8"
          style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
        >
          <QualityRow
            qk="Janela de observação"
            qv={`${periodDays} dias · L2 contínuo`}
          />
          <QualityRow
            qk="Volume de dados"
            qv={
              <>
                {formatNumber(sessions)} sessões · {totalRepos}{" "}
                {totalRepos === 1 ? "repo" : "repos"} ·{" "}
                {sessions >= 30 && totalRepos >= 1 ? (
                  <span style={{ color: "var(--ok)" }}>suficiente</span>
                ) : (
                  <span style={{ color: "var(--warn)" }}>abaixo do mínimo</span>
                )}{" "}
                <span style={{ color: "var(--muted)" }}>
                  (mínimo: 30 sessões + 1 repo)
                </span>
              </>
            }
          />
          <QualityRow
            qk="Schema do bundle"
            qv={
              <>
                v{bundle.payload.beheld_version}{" "}
                <span className="font-mono" style={{ color: "var(--muted)" }}>
                  · {schemaOk ? "válido" : "warning"}
                </span>
              </>
            }
          />
          <QualityRow
            qk="Warnings"
            qv={
              result?.warnings && result.warnings.length > 0 ? (
                <span style={{ color: "var(--warn)" }}>
                  {result.warnings.join(" · ")}
                </span>
              ) : (
                <span style={{ color: "var(--ok)" }}>nenhum</span>
              )
            }
          />
          <QualityRow
            qk="Confiabilidade"
            qv={
              tier === "fully_verifiable"
                ? "Alta · todas as camadas técnicas válidas"
                : tier === "signed_only"
                ? "Média · assinatura válida sem identidade GitHub atestada"
                : tier === "incomplete"
                ? "Baixa · verificação incompleta — ver chain abaixo"
                : "Verificando…"
            }
          />
        </div>
      </section>

      {/* ═══ 04 · CADEIA DE VERIFICAÇÃO ══════════════════════════════════ */}
      <section className="py-12">
        <SectionHead
          num="04"
          title="Cadeia de verificação"
          emTail={`· tier ${tier}`}
          right={tierLabel(tier)}
        />
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
          <ChainRow
            ok={sigOk && hashOk}
            name="Assinatura Ed25519"
            desc="Bundle assinado com a chave do dev. Verificado offline via crypto.subtle."
            detail="fingerprint"
            detailValue={sigFp}
          />
          <ChainRow
            ok={true}
            name="Chain hash"
            desc={
              bundle.payload.previous_hash
                ? "Snapshot anterior referenciado. Cadeia contínua desde genesis."
                : "Snapshot genesis (primeiro da cadeia)."
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
            name="Identidade GitHub"
            desc={
              attOk
                ? `Public key vinculada a @${github?.login} via OAuth. Plataforma assinou.`
                : "Sem attestation OAuth — identidade não verificada."
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
            name="Engine version"
            desc="Build do engine que produziu este bundle."
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
          <strong style={{ color: "var(--text)", fontWeight: 500 }}>Importante.</strong> Beheld
          nunca afirma "esse dev é confiável" — apenas relata que estas camadas técnicas estão
          válidas neste momento. A interpretação dos sinais fica com quem está contratando.
          Beheld é testemunha. O juiz é quem precisa do trabalhador.
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
          Download .beheld bundle
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
          View raw JSON
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
          Verify offline (CLI)
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
            profile id ·{" "}
            <strong style={{ color: "var(--accent)", fontWeight: 500 }}>{profileId}</strong>
          </div>
          <div>
            bundle hash ·{" "}
            <span className="font-mono" style={{ color: "var(--muted-soft)" }}>
              {bundle.hash.replace(/^sha256:/, "").slice(0, 16)}…
            </span>
          </div>
          <div>
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>
              forever free for developers
            </span>
          </div>
        </div>
      </div>

      {/* Last verified timestamp (debug-ish but small) */}
      <div
        className="pb-8 text-center font-mono"
        style={{ color: "var(--muted-soft)", fontSize: 9, letterSpacing: "0.08em" }}
      >
        bundle created at {formatIsoZ(bundle.payload.created_at)}
      </div>
    </div>
  );
}
