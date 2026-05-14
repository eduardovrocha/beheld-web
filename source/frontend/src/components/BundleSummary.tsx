import type {
  Bundle,
  BundleL1Section,
  BundleL2Section,
  BundlePayloadV1,
} from "@/lib/types";
import { ScoreBar } from "./ScoreBar";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function topNumericEntries(record: Record<string, number>, limit = 6): [string, number][] {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/** Both v1 (signals) and v2 (l1+l2) payloads end up with an L2 view by way of
 *  this helper. v1 has no L1 → caller renders the "execute devprofile import"
 *  fallback block. */
function readSections(payload: Bundle["payload"]): {
  l1: BundleL1Section | null;
  l2: BundleL2Section | null;
} {
  // Treat the payload defensively — old (v1) bundles will be missing `l1`
  // and have a top-level `signals` field instead of `l2`.
  const p = payload as unknown as Bundle["payload"] & Partial<BundlePayloadV1>;
  const l1 = (p.l1 as BundleL1Section | undefined) ?? null;
  const l2 = (p.l2 ?? p.signals ?? null) as BundleL2Section | null;
  return { l1, l2 };
}

export function BundleSummary({ bundle }: { bundle: Bundle }) {
  const { payload } = bundle;
  const { scores } = payload;
  const { l1, l2 } = readSections(payload);

  return (
    <div className="space-y-8">
      {/* Scores */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Scores</h2>
          {l2 && (
            <div className="font-mono text-sm text-slate-500">
              {l2.sessions_analyzed} sessões · últimos {l2.period_days} dias
            </div>
          )}
        </div>
        <div className="space-y-1">
          <ScoreBar label="Prompt quality" value={scores.prompt_quality} />
          <ScoreBar label="Test maturity" value={scores.test_maturity} />
          <ScoreBar label="Tech breadth" value={scores.tech_breadth} />
          <ScoreBar label="Growth rate" value={scores.growth_rate} />
        </div>
        <div className="mt-6 flex items-baseline gap-3 border-t border-slate-800 pt-4">
          <span className="text-sm uppercase tracking-wider text-slate-500">Overall</span>
          <span className="font-mono text-3xl font-bold tabular-nums text-slate-100">
            {scores.overall}
          </span>
          <span className="text-slate-500">/100</span>
        </div>
      </section>

      {/* Composition (Phase 6 — L1 + L2 surfaced separately) */}
      <CompositionSection l1={l1} l2={l2} />

      {/* L1 — git history */}
      {l1 && l1.total_repos > 0 && <L1Section l1={l1} />}

      {/* L2 — session signals */}
      {l2 && <L2Section l2={l2} />}
    </div>
  );
}

function CompositionSection({
  l1,
  l2,
}: {
  l1: BundleL1Section | null;
  l2: BundleL2Section | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-200">Perfil capturado</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between border-b border-slate-800/60 py-1">
          <dt className="text-slate-400">Base histórica</dt>
          <dd className="font-mono text-slate-200">
            {l1 && l1.total_repos > 0
              ? `${l1.total_repos} repositórios · ${l1.total_commits.toLocaleString("pt-BR")} commits`
              : <span className="text-slate-500">não disponível (execute devprofile import)</span>}
          </dd>
        </div>
        <div className="flex items-baseline justify-between py-1">
          <dt className="text-slate-400">Trajetória observada</dt>
          <dd className="font-mono text-slate-200">
            {l2 ? `${l2.sessions_analyzed} sessões · ${l2.period_days} dias` : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function L1Section({ l1 }: { l1: BundleL1Section }) {
  const ecoKeys = Object.entries(l1.ecosystems).filter(([, v]) => v).map(([k]) => k);
  const platKeys = Object.entries(l1.platforms).filter(([, v]) => v).map(([k]) => k);
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="mb-1 text-lg font-semibold text-slate-200">L1 — histórico git</h2>
      <p className="mb-4 text-xs text-slate-500">
        Sinais imutáveis extraídos do histórico de repositórios importados.
      </p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <MetricRow label="Repositórios" value={l1.total_repos.toString()} />
        <MetricRow label="Commits" value={l1.total_commits.toLocaleString("pt-BR")} />
        {l1.earliest_commit && (
          <MetricRow label="Primeiro commit" value={l1.earliest_commit.slice(0, 10)} />
        )}
        {l1.latest_commit && (
          <MetricRow label="Último commit" value={l1.latest_commit.slice(0, 10)} />
        )}
        <MetricRow label="Test ratio (avg)" value={pct(l1.avg_test_ratio)} />
      </dl>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SignalCard title="Ecossistemas" entries={ecoKeys} />
        <SignalCard title="Plataformas" entries={platKeys} />
      </div>
    </section>
  );
}

function L2Section({ l2 }: { l2: BundleL2Section }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-200">L2 — trajetória observada</h2>
        <p className="text-xs text-slate-500">
          Sinais derivados das sessões recentes do Claude Code / Continue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NumericSignalCard
          title="Plataformas"
          entries={topNumericEntries(l2.platforms)}
          fmt={(v) => v.toString()}
        />
        <NumericSignalCard
          title="Ecossistemas"
          entries={topNumericEntries(l2.ecosystems)}
          fmt={(v) => v.toString()}
        />
        <NumericSignalCard
          title="Workflow"
          entries={topNumericEntries(l2.workflow_distribution)}
          fmt={(v) => pct(v)}
        />
        <NumericSignalCard
          title="Tipos de projeto"
          entries={topNumericEntries(l2.project_categories)}
          fmt={(v) => pct(v)}
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Workflow metrics
        </h3>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <MetricRow label="Test-after ratio" value={pct(l2.workflow_metrics.test_after_ratio)} />
          <MetricRow label="Test-first ratio" value={pct(l2.workflow_metrics.test_first_ratio)} />
          <MetricRow
            label="Mediana de delay teste-depois"
            value={`${l2.workflow_metrics.median_test_delay_min.toFixed(1)} min`}
          />
          <MetricRow
            label="Bash → Read"
            value={`${l2.workflow_metrics.bash_to_read_ratio.toFixed(2)}×`}
          />
          <MetricRow
            label="Prompt avg"
            value={`${Math.round(l2.workflow_metrics.prompt_avg_chars)} chars`}
          />
          <MetricRow
            label="Sessão avg"
            value={`${l2.workflow_metrics.session_avg_duration_min.toFixed(0)} min`}
          />
          <MetricRow
            label="Variedade de tools"
            value={l2.workflow_metrics.tool_variety_avg.toFixed(1)}
          />
          <MetricRow
            label="Concentração ecossistemas"
            value={l2.workflow_metrics.ecosystem_concentration.toFixed(2)}
          />
        </dl>
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-800/60 py-1">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-mono text-slate-200">{value}</dd>
    </div>
  );
}

function SignalCard({ title, entries }: { title: string; entries: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {entries.length === 0 ? (
        <div className="text-sm text-slate-600">—</div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {entries.map((k) => (
            <li
              key={k}
              className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-xs text-slate-300"
            >
              {k}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NumericSignalCard({
  title,
  entries,
  fmt,
}: {
  title: string;
  entries: [string, number][];
  fmt: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {entries.length === 0 ? (
        <div className="text-sm text-slate-600">—</div>
      ) : (
        <ul className="space-y-1.5">
          {entries.map(([k, v]) => (
            <li key={k} className="flex items-baseline justify-between text-sm">
              <span className="text-slate-200">{k}</span>
              <span className="font-mono text-slate-400 tabular-nums">{fmt(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
