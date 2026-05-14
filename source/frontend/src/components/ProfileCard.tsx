/**
 * ProfileCard — full profile layout for both `/v/:id` (fetched bundle) and
 * `/verify` (drag-drop local file).  Mirrors the server-rendered HTML at
 * Rails `:3000/v/:id` so the SPA and the Rails portal share visual language.
 *
 * Sections (top → bottom):
 *   1. Header card — avatar, ID, ED25519 pill, big overall score
 *   2. Stats grid — 5 cells with progress bars (4 dimensions + sessions)
 *   3. Trend chart placeholder (chain history isn't available in the SPA)
 *   4. Two-column L1 + L2 facts/chips
 *   5. Proof footer — SHA256 / ED25519 / PUB_KEY / ISSUED + SIG_MATCH
 *
 * Privacy: never renders root_commit_hashes as a list, repo names, paths,
 * branch names, or any free-text from the bundle.
 */
import { useState } from "react";

import type {
  Bundle,
  BundleL1Section,
  BundleL2Section,
  BundlePayloadV1,
} from "@/lib/types";
import type { VerifyResult } from "@/lib/verify";

interface Props {
  bundle: Bundle;
  result: VerifyResult | null;
  verifying: boolean;
  /** Optional opaque identifier (Rails short_id).  Falls back to the first
   *  8 chars of the bundle hash when a local file is dropped in /verify. */
  shortId?: string | null;
  /** Optional banner content (e.g. expiration warning).  Rendered above the
   *  card so the article stays self-contained. */
  banner?: React.ReactNode;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function scoreBucket(score: number): "green" | "yellow" | "red" {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

const FILL_CLASSES: Record<ReturnType<typeof scoreBucket>, string> = {
  green:  "bg-emerald-500 dark:bg-emerald-400",
  yellow: "bg-amber-500 dark:bg-amber-400",
  red:    "bg-rose-500 dark:bg-rose-400",
};
const FILL_ACCENT = "bg-emerald-500 dark:bg-emerald-400";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function activityWindow(l1: BundleL1Section): string {
  const a = parseIso(l1.earliest_commit);
  const b = parseIso(l1.latest_commit);
  if (!a || !b) return "—";
  return `${a.getFullYear()} → ${b.getFullYear()}`;
}

function daysAgo(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return "—";
  const ms = Date.now() - d.getTime();
  const days = Math.max(0, Math.floor(ms / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

const WORKFLOW_LABELS: Record<string, string> = {
  tdd: "TDD",
  "test-after": "Test-after",
  test_after: "Test-after",
  "debug-driven": "Debug-driven",
  debug_driven: "Debug-driven",
  "feature-work": "Feature work",
  feature_work: "Feature work",
  refactor: "Refactor",
  exploration: "Exploration",
  exploratory: "Exploration",
};

function humanizeWorkflow(key: string): string {
  return WORKFLOW_LABELS[key] ?? key;
}

function formatWorkflowDistribution(
  dist: Record<string, number> | undefined,
  limit = 3,
): string {
  if (!dist || Object.keys(dist).length === 0) return "—";
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, v]) => `${humanizeWorkflow(k)} ${Math.round(v * 100)}%`)
    .join(" · ");
}

function topKeys(record: Record<string, number> | undefined, limit = 6): string[] {
  if (!record) return [];
  return Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

function trueKeys(record: Record<string, boolean> | undefined): string[] {
  if (!record) return [];
  return Object.entries(record).filter(([, v]) => v).map(([k]) => k);
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

function deriveInitials(short: string): string {
  const chars = short.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return chars.length === 2 ? chars : "DP";
}

function formatShortId(short: string): string {
  if (short.length <= 8) return short;
  return `${short.slice(0, 4)}-${short.slice(4, 8)}`;
}

function formatIsoZ(iso: string | undefined | null): string {
  const d = parseIso(iso ?? null);
  if (!d) return "—";
  return d.toISOString().slice(0, 19) + "Z";
}

// ── sub-components ───────────────────────────────────────────────────────────

function Avatar({ short }: { short: string }) {
  return (
    <div className="flex size-20 items-center justify-center rounded-2xl border border-slate-200 bg-white font-mono text-xs font-bold tracking-widest text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      {deriveInitials(short)}
    </div>
  );
}

function VerifyPill({
  result,
  verifying,
}: {
  result: VerifyResult | null;
  verifying: boolean;
}) {
  let text: string;
  let color: string;
  let pulse = false;

  if (verifying || !result) {
    text = "ED25519 PROFILE";
    color = "text-slate-500 dark:text-slate-400";
    pulse = false;
  } else if (result.ok) {
    text = "ED25519 VERIFIED PROFILE";
    color = "text-emerald-600 dark:text-emerald-400";
    pulse = true;
  } else {
    text = "ED25519 — SIGNATURE FAILED";
    color = "text-rose-600 dark:text-rose-400";
  }

  return (
    <div className={`mt-3 flex items-center gap-2 font-mono text-[11px] font-bold ${color}`}>
      {pulse ? (
        <span className="relative inline-flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50 dark:bg-emerald-400"></span>
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
        </span>
      ) : (
        <span className="inline-flex size-2 rounded-full bg-slate-400 dark:bg-slate-600"></span>
      )}
      <span>{text}</span>
    </div>
  );
}

function StatCell({
  label,
  value,
  withBar = true,
  accent = false,
}: {
  label: string;
  value: number;
  withBar?: boolean;
  accent?: boolean;
}) {
  const fill = accent ? FILL_ACCENT : FILL_CLASSES[scoreBucket(value)];
  return (
    <div className="border-b border-slate-200 p-6 last:border-r-0 dark:border-slate-800 md:border-b-0 md:border-r">
      <div className="mb-4 font-mono text-[10px] uppercase text-slate-500 dark:text-slate-500">{label}</div>
      <div className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</div>
      {withBar && (
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="img"
          aria-label={`${label} ${value} de 100`}
        >
          <div className={`h-full ${fill}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
      )}
    </div>
  );
}

function FactRow({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-end justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-mono font-bold ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"}`}>{value}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-xs text-slate-800 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-slate-200">
      {children}
    </span>
  );
}

function ChipMuted({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
      {children}
    </span>
  );
}

function L1Panel({ l1 }: { l1: BundleL1Section | null }) {
  const present = l1 !== null && l1.total_repos > 0;
  return (
    <section>
      <h3 className="mb-6 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">
        <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
        <span>L1: <span className="text-slate-900 dark:text-slate-100">Git History Analysis</span></span>
      </h3>
      {present && l1 ? (
        <div className="space-y-3">
          <FactRow label="Total Repositories" value={l1.total_repos} />
          <FactRow label="Total Commits" value={formatNumber(l1.total_commits)} />
          <FactRow label="Activity Window" value={<span className="text-sm">{activityWindow(l1)}</span>} />
          <FactRow
            label="Average Test Ratio"
            value={l1.avg_test_ratio.toFixed(2)}
            accent
          />
          <FactRow label="Last Commit" value={daysAgo(l1.latest_commit)} />

          <div className="space-y-3 pt-2">
            <div className="font-mono text-[10px] uppercase text-slate-500">Primary Ecosystems</div>
            <div className="flex flex-wrap gap-2">
              {trueKeys(l1.ecosystems).slice(0, 8).map((k) => (
                <Chip key={k}>{k}: true</Chip>
              ))}
              {trueKeys(l1.ecosystems).length === 0 && <ChipMuted>—</ChipMuted>}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="font-mono text-[10px] uppercase text-slate-500">Platforms</div>
            <div className="flex flex-wrap gap-2">
              {trueKeys(l1.platforms).slice(0, 8).map((k) => (
                <ChipMuted key={k}>{k}</ChipMuted>
              ))}
              {trueKeys(l1.platforms).length === 0 && <ChipMuted>—</ChipMuted>}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <div className="mb-2 font-mono text-xs uppercase text-slate-500">Bootstrap não realizado</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Execute <code className="font-mono text-slate-700 dark:text-slate-300">devprofile import &lt;url&gt;</code> para popular a base histórica.
          </p>
        </div>
      )}
    </section>
  );
}

function L2Panel({ l2 }: { l2: BundleL2Section | null }) {
  const present = l2 !== null && l2.sessions_analyzed > 0;
  return (
    <section>
      <h3 className="mb-6 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">
        <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
        <span>L2: <span className="text-slate-900 dark:text-slate-100">Agentic Workflow Metrics</span></span>
      </h3>
      {present && l2 ? (
        <div className="space-y-3">
          <FactRow label="Sessions Analyzed" value={l2.sessions_analyzed} />
          <FactRow label="Period" value={<span className="text-sm">{l2.period_days} days</span>} />
          {l2.workflow_metrics?.test_after_ratio !== undefined && (
            <FactRow
              label="Test-after Ratio"
              value={l2.workflow_metrics.test_after_ratio.toFixed(2)}
              accent
            />
          )}
          {l2.workflow_metrics?.bash_to_read_ratio !== undefined && (
            <FactRow
              label="Bash → Read"
              value={`${l2.workflow_metrics.bash_to_read_ratio.toFixed(2)}×`}
            />
          )}
          {l2.workflow_metrics?.session_avg_duration_min !== undefined && (
            <FactRow
              label="Avg Session Duration"
              value={`${Math.round(l2.workflow_metrics.session_avg_duration_min)} min`}
            />
          )}
          {l2.workflow_metrics?.tool_variety_avg !== undefined && (
            <FactRow
              label="Tool Variety (avg)"
              value={l2.workflow_metrics.tool_variety_avg.toFixed(1)}
            />
          )}

          {l2.workflow_distribution && Object.keys(l2.workflow_distribution).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="font-mono text-[10px] uppercase text-slate-500">Workflow Distribution</div>
              <div className="flex flex-wrap gap-2">
                <Chip>{formatWorkflowDistribution(l2.workflow_distribution)}</Chip>
              </div>
            </div>
          )}

          {topKeys(l2.ecosystems).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="font-mono text-[10px] uppercase text-slate-500">Ecosystems (top)</div>
              <div className="flex flex-wrap gap-2">
                {topKeys(l2.ecosystems).map((k) => <ChipMuted key={k}>{k}</ChipMuted>)}
              </div>
            </div>
          )}

          {topKeys(l2.platforms).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="font-mono text-[10px] uppercase text-slate-500">Platforms (top)</div>
              <div className="flex flex-wrap gap-2">
                {topKeys(l2.platforms).map((k) => <ChipMuted key={k}>{k}</ChipMuted>)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <div className="mb-2 font-mono text-xs uppercase text-slate-500">L1_ONLY Profile</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No Claude Code session telemetry submitted. Workflow signals are limited to git history.
          </p>
        </div>
      )}
    </section>
  );
}

function ProofRow({ field, value, copyable = false }: { field: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };
  return (
    <div className="flex gap-4 text-[11px] leading-relaxed">
      <span className="w-16 shrink-0 opacity-40">{field}</span>
      {/*
        The footer text color uses the *current* foreground (slate-100 light /
        slate-950 dark via the .proof wrapper); these spans inherit but we
        soften them with opacity to mimic the mock's hierarchy.
      */}
      <span className="break-all opacity-70">
        {value}
        {copyable && (
          <button
            type="button"
            onClick={onCopy}
            className="ml-2 rounded border border-current/25 px-2 py-0.5 font-mono text-[10px] opacity-70 hover:bg-current/10"
          >
            {copied ? "copied" : "copy"}
          </button>
        )}
      </span>
    </div>
  );
}

function ProofFooter({
  bundle,
  result,
  verifying,
}: {
  bundle: Bundle;
  result: VerifyResult | null;
  verifying: boolean;
}) {
  let status: string;
  let bad = false;
  if (verifying || !result) {
    status = "SIG_MATCH: VERIFYING…";
  } else if (!result.checks.hash.ok) {
    status = "SIG_MATCH: HASH_FAIL";
    bad = true;
  } else if (!result.checks.signature.ok) {
    status = "SIG_MATCH: FAIL";
    bad = true;
  } else {
    status = "SIG_MATCH: OK";
  }

  const inner = bundle.payload as Bundle["payload"];

  // Footer is always *inverted* relative to the page surface — same contrast
  // cue as the Rails portal in both themes (dark footer on light page; light
  // footer on dark page).
  return (
    <footer className="bg-slate-900 p-6 font-mono text-slate-100 dark:bg-slate-100 dark:text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-50">
          Proof of Authenticity (v{(bundle as unknown as { version?: string }).version ?? "?"}.0)
        </span>
        <span className={`text-[10px] font-bold ${bad ? "text-rose-400 dark:text-rose-600" : "text-emerald-400 dark:text-emerald-600"}`}>{status}</span>
      </div>
      <div className="space-y-2">
        <ProofRow field="SHA256"  value={(bundle as unknown as { hash: string }).hash} />
        <ProofRow field="ED25519" value={(bundle as unknown as { signature: string }).signature} />
        <ProofRow field="PUB_KEY" value={(bundle as unknown as { public_key: string }).public_key} copyable />
        <ProofRow
          field="ISSUED"
          value={`${formatIsoZ(inner.created_at)} · devprofile ${inner.devprofile_version}`}
        />
      </div>
    </footer>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export function ProfileCard({ bundle, result, verifying, shortId, banner }: Props) {
  const inner = bundle.payload;
  const { scores } = inner;
  const { l1, l2 } = readSections(bundle);

  // For local files (drag-drop) we don't have a short_id, so derive an opaque
  // identifier from the bundle hash instead.
  const opaqueId =
    shortId ?? (bundle as unknown as { hash: string }).hash.replace(/^sha256:/, "").slice(0, 11);

  return (
    <>
      {banner}
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {/* ── header ──────────────────────────────────────────────────────── */}
        <header className="border-b border-slate-200 bg-slate-50/80 p-8 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <Avatar short={opaqueId} />
              <div>
                <h1 className="mb-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">DevProfile</h1>
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">ID: {formatShortId(opaqueId)}</p>
                <VerifyPill result={result} verifying={verifying} />
              </div>
            </div>
            <div className="text-right">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">Overall Score</div>
              <div className="font-mono text-6xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{scores.overall}</div>
            </div>
          </div>
        </header>

        {/* ── stats grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 md:grid-cols-5">
          <StatCell label="Prompt Q." value={scores.prompt_quality} />
          <StatCell label="Test Mat." value={scores.test_maturity} />
          <StatCell label="Breadth"   value={scores.tech_breadth} />
          <StatCell label="Growth"    value={scores.growth_rate} accent />
          <StatCell label="Sessions"  value={l2?.sessions_analyzed ?? 0} withBar={false} />
        </div>

        {/* ── trend placeholder (chain not available client-side) ─────────── */}
        <section className="border-b border-slate-200 p-8 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
            <span>TREND: <span className="text-slate-900 dark:text-slate-100">12-Month Score Trajectory</span></span>
          </h3>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Snapshots reconstructed from signed payload chain via <code className="font-mono">previous_hash</code>.
          </p>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Trajetória requer múltiplos snapshots na cadeia — disponível em <code className="ml-2 font-mono">/v/:id</code> servido pelo Rails.
          </div>
        </section>

        {/* ── L1 + L2 ─────────────────────────────────────────────────────── */}
        <div className="grid gap-12 p-8 md:grid-cols-2">
          <L1Panel l1={l1} />
          <L2Panel l2={l2} />
        </div>

        {/* ── proof footer ────────────────────────────────────────────────── */}
        <ProofFooter bundle={bundle} result={result} verifying={verifying} />
      </article>
    </>
  );
}
