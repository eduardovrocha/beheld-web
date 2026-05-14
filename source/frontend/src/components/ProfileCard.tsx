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

import { useT } from "@/i18n/I18nProvider";
import type {
  Bundle,
  BundleL1Section,
  BundleL2Section,
  BundlePayloadV1,
} from "@/lib/types";
import type { VerifyResult } from "@/lib/verify";

import { TechIcon } from "./TechIcon";

type TFunc = ReturnType<typeof useT>;

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

function daysAgo(iso: string | null | undefined, t: TFunc): string {
  const d = parseIso(iso);
  if (!d) return t("common.dash");
  const ms = Date.now() - d.getTime();
  const days = Math.max(0, Math.floor(ms / 86_400_000));
  if (days === 0) return t("common.today");
  if (days === 1) return t("common.one_day_ago");
  return t("common.days_ago", { days });
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
  const t = useT();
  let text: string;
  let color: string;
  let pulse = false;

  if (verifying || !result) {
    text = t("profile.pill.idle");
    color = "text-slate-500 dark:text-slate-400";
    pulse = false;
  } else if (result.ok) {
    text = t("profile.pill.ok");
    color = "text-emerald-600 dark:text-emerald-400";
    pulse = true;
  } else {
    text = t("profile.pill.fail");
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

/** Chip with a leading brand glyph — for ecosystems / platforms detected
 *  on the bundle. Falls back to a neutral dot when the icon set doesn't
 *  cover the key. */
function TechChip({ name, accented = false }: { name: string; accented?: boolean }) {
  const base = "inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-xs";
  const tone = accented
    ? "border border-emerald-500/20 bg-emerald-500/10 text-slate-800 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-slate-200"
    : "border border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400";
  return (
    <span className={`${base} ${tone}`}>
      <TechIcon name={name} size={14} />
      <span>{name}</span>
    </span>
  );
}

function L1Panel({ l1 }: { l1: BundleL1Section | null }) {
  const t = useT();
  const present = l1 !== null && l1.total_repos > 0;
  return (
    <section>
      <h3 className="mb-6 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">
        <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
        <span>L1: <span className="text-slate-900 dark:text-slate-100">{t("profile.l1.title")}</span></span>
      </h3>
      {present && l1 ? (
        <div className="space-y-3">
          <FactRow label={t("profile.l1.repos")} value={l1.total_repos} />
          <FactRow label={t("profile.l1.commits")} value={formatNumber(l1.total_commits)} />
          <FactRow label={t("profile.l1.activity_window")} value={<span className="text-sm">{activityWindow(l1)}</span>} />
          <FactRow
            label={t("profile.l1.avg_test_ratio")}
            value={l1.avg_test_ratio.toFixed(2)}
            accent
          />
          <FactRow label={t("profile.l1.last_commit")} value={daysAgo(l1.latest_commit, t)} />

          <div className="space-y-3 pt-2">
            <div className="font-mono text-[10px] uppercase text-slate-500">{t("profile.l1.primary_ecosystems")}</div>
            <div className="flex flex-wrap gap-2">
              {trueKeys(l1.ecosystems).slice(0, 8).map((k) => (
                <TechChip key={k} name={k} accented />
              ))}
              {trueKeys(l1.ecosystems).length === 0 && <ChipMuted>{t("common.dash")}</ChipMuted>}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="font-mono text-[10px] uppercase text-slate-500">{t("profile.l1.platforms")}</div>
            <div className="flex flex-wrap gap-2">
              {trueKeys(l1.platforms).slice(0, 8).map((k) => (
                <TechChip key={k} name={k} />
              ))}
              {trueKeys(l1.platforms).length === 0 && <ChipMuted>{t("common.dash")}</ChipMuted>}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <div className="mb-2 font-mono text-xs uppercase text-slate-500">{t("profile.l1.empty.badge")}</div>
          <p
            className="text-sm text-slate-500 dark:text-slate-400 [&_code]:font-mono [&_code]:text-slate-700 dark:[&_code]:text-slate-300"
            dangerouslySetInnerHTML={{ __html: t("profile.l1.empty.hint_html") }}
          />
        </div>
      )}
    </section>
  );
}

function L2Panel({ l2 }: { l2: BundleL2Section | null }) {
  const t = useT();
  const present = l2 !== null && l2.sessions_analyzed > 0;
  return (
    <section>
      <h3 className="mb-6 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">
        <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
        <span>L2: <span className="text-slate-900 dark:text-slate-100">{t("profile.l2.title")}</span></span>
      </h3>
      {present && l2 ? (
        <div className="space-y-3">
          <FactRow label={t("profile.l2.sessions_analyzed")} value={l2.sessions_analyzed} />
          <FactRow label={t("profile.l2.period")} value={<span className="text-sm">{t("common.period_days", { days: l2.period_days })}</span>} />
          {l2.workflow_metrics?.test_after_ratio !== undefined && (
            <FactRow
              label={t("profile.l2.test_after_ratio")}
              value={l2.workflow_metrics.test_after_ratio.toFixed(2)}
              accent
            />
          )}
          {l2.workflow_metrics?.bash_to_read_ratio !== undefined && (
            <FactRow
              label={t("profile.l2.bash_to_read")}
              value={`${l2.workflow_metrics.bash_to_read_ratio.toFixed(2)}×`}
            />
          )}
          {l2.workflow_metrics?.session_avg_duration_min !== undefined && (
            <FactRow
              label={t("profile.l2.avg_session_duration")}
              value={t("common.duration_min", { min: Math.round(l2.workflow_metrics.session_avg_duration_min) })}
            />
          )}
          {l2.workflow_metrics?.tool_variety_avg !== undefined && (
            <FactRow
              label={t("profile.l2.tool_variety")}
              value={l2.workflow_metrics.tool_variety_avg.toFixed(1)}
            />
          )}

          {l2.workflow_distribution && Object.keys(l2.workflow_distribution).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="font-mono text-[10px] uppercase text-slate-500">{t("profile.l2.workflow_distribution")}</div>
              <div className="flex flex-wrap gap-2">
                <Chip>{formatWorkflowDistribution(l2.workflow_distribution)}</Chip>
              </div>
            </div>
          )}

          {topKeys(l2.ecosystems).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="font-mono text-[10px] uppercase text-slate-500">{t("profile.l2.ecosystems_top")}</div>
              <div className="flex flex-wrap gap-2">
                {topKeys(l2.ecosystems).map((k) => <TechChip key={k} name={k} accented />)}
              </div>
            </div>
          )}

          {topKeys(l2.platforms).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="font-mono text-[10px] uppercase text-slate-500">{t("profile.l2.platforms_top")}</div>
              <div className="flex flex-wrap gap-2">
                {topKeys(l2.platforms).map((k) => <TechChip key={k} name={k} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <div className="mb-2 font-mono text-xs uppercase text-slate-500">{t("profile.l2.empty.badge")}</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("profile.l2.empty.hint")}
          </p>
        </div>
      )}
    </section>
  );
}

/** Glyph rendered in the tooltip header — one per proof field. */
function ProofFieldIcon({ field, size = 14 }: { field: string; size?: number }) {
  const common = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (field === "SHA256") {
    // Hash glyph (#)
    return (
      <svg {...common}>
        <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
      </svg>
    );
  }
  if (field === "ED25519") {
    // Signature / quill glyph
    return (
      <svg {...common}>
        <path d="M12 19H6a2 2 0 0 1-2-2v-1l9-9 3 3" />
        <path d="m15 10 3-3a2 2 0 1 1 3 3l-3 3" />
        <path d="M2 22h20" />
      </svg>
    );
  }
  // PUB_KEY — key glyph
  return (
    <svg {...common}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}

/** Proof chip — hover (or focus) reveals a styled card with the field's
 *  long value and a short description. Click-to-copy was removed per spec;
 *  if the user wants to copy, they select the value inside the tooltip. */
function ProofChip({
  field,
  value,
  descKey,
}: {
  field: string;
  value: string;
  descKey: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? `proof-tip-${field}` : undefined}
        className="cursor-help font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 underline decoration-dotted underline-offset-4 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
      >
        {field}
      </button>
      {open && (
        <div
          id={`proof-tip-${field}`}
          role="tooltip"
          className="absolute bottom-full left-0 z-20 mb-2 w-[20rem] max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            <ProofFieldIcon field={field} />
            <span>{field}</span>
          </div>
          <p className="mb-2 break-all font-mono text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
            {value}
          </p>
          <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {t(descKey)}
          </p>
        </div>
      )}
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
  const t = useT();
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

  // Footer shares the card's surface palette — same hierarchy as the header
  // and the L1 / L2 panels, just one tone darker to mark a section break.
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80 p-6 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {t("profile.proof.title", { version: (bundle as unknown as { version?: string }).version ?? "?" })}
        </span>
        <span className={`text-[10px] font-bold ${bad ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{status}</span>
      </div>

      {/* SHA256 / ED25519 / PUB_KEY — hover (or focus) opens a tooltip
          card with the value and a short description. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <ProofChip
          field="SHA256"
          value={(bundle as unknown as { hash: string }).hash}
          descKey="profile.proof.sha256.desc"
        />
        <ProofChip
          field="ED25519"
          value={(bundle as unknown as { signature: string }).signature}
          descKey="profile.proof.ed25519.desc"
        />
        <ProofChip
          field="PUB_KEY"
          value={(bundle as unknown as { public_key: string }).public_key}
          descKey="profile.proof.pubkey.desc"
        />
      </div>

      {/* ISSUED — informational, value always visible. */}
      <div className="flex gap-4 text-[11px] leading-relaxed">
        <span className="w-16 shrink-0 text-slate-500">ISSUED</span>
        <span className="break-all text-slate-700 dark:text-slate-300">
          {formatIsoZ(inner.created_at)} · devprofile {inner.devprofile_version}
        </span>
      </div>
    </footer>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export function ProfileCard({ bundle, result, verifying, shortId, banner }: Props) {
  const t = useT();
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
                <h1 className="mb-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("profile.title")}</h1>
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{t("profile.id_prefix")} {formatShortId(opaqueId)}</p>
                <VerifyPill result={result} verifying={verifying} />
              </div>
            </div>
            <div className="text-right">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">{t("profile.overall_score")}</div>
              <div className="font-mono text-6xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{scores.overall}</div>
            </div>
          </div>
        </header>

        {/* ── stats grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 md:grid-cols-5">
          <StatCell label={t("profile.stats.prompt")}  value={scores.prompt_quality} />
          <StatCell label={t("profile.stats.test")}    value={scores.test_maturity} />
          <StatCell label={t("profile.stats.breadth")} value={scores.tech_breadth} />
          <StatCell label={t("profile.stats.growth")}  value={scores.growth_rate} accent />
          <StatCell label={t("profile.stats.sessions")} value={l2?.sessions_analyzed ?? 0} withBar={false} />
        </div>

        {/* ── trend placeholder (chain not available client-side) ─────────── */}
        <section className="border-b border-slate-200 p-8 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
            <span>TREND: <span className="text-slate-900 dark:text-slate-100">{t("profile.trend.title")}</span></span>
          </h3>
          <p
            className="mb-4 text-xs text-slate-500 dark:text-slate-400 [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: t("profile.trend.subtitle_html") }}
          />
          <div
            className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: t("profile.trend.unavailable_html") }}
          />
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
