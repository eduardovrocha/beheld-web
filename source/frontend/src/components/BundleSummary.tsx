import type { Bundle } from "@/lib/types";
import { ScoreBar } from "./ScoreBar";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function topEntries(record: Record<string, number>, limit = 6): [string, number][] {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function BundleSummary({ bundle }: { bundle: Bundle }) {
  const { payload } = bundle;
  const { scores, signals } = payload;

  return (
    <div className="space-y-8">
      {/* Scores */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Scores</h2>
          <div className="font-mono text-sm text-slate-500">
            {signals.sessions_analyzed} sessões · últimos {signals.period_days} dias
          </div>
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

      {/* Signals grid */}
      <section className="grid gap-4 md:grid-cols-2">
        <SignalCard
          title="Plataformas"
          entries={topEntries(signals.platforms)}
          fmt={(v) => v.toString()}
        />
        <SignalCard
          title="Ecossistemas"
          entries={topEntries(signals.ecosystems)}
          fmt={(v) => v.toString()}
        />
        <SignalCard
          title="Workflow"
          entries={topEntries(signals.workflow_distribution)}
          fmt={(v) => pct(v)}
        />
        <SignalCard
          title="Tipos de projeto"
          entries={topEntries(signals.project_categories)}
          fmt={(v) => pct(v)}
        />
      </section>

      {/* Workflow metrics — diagnostic detail, less prominent */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Workflow metrics</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <MetricRow label="Test-after ratio" value={pct(signals.workflow_metrics.test_after_ratio)} />
          <MetricRow label="Test-first ratio" value={pct(signals.workflow_metrics.test_first_ratio)} />
          <MetricRow
            label="Mediana de delay teste-depois"
            value={`${signals.workflow_metrics.median_test_delay_min.toFixed(1)} min`}
          />
          <MetricRow
            label="Bash → Read"
            value={`${signals.workflow_metrics.bash_to_read_ratio.toFixed(2)}×`}
          />
          <MetricRow
            label="Prompt avg"
            value={`${Math.round(signals.workflow_metrics.prompt_avg_chars)} chars`}
          />
          <MetricRow
            label="Sessão avg"
            value={`${signals.workflow_metrics.session_avg_duration_min.toFixed(0)} min`}
          />
          <MetricRow
            label="Variedade de tools"
            value={signals.workflow_metrics.tool_variety_avg.toFixed(1)}
          />
          <MetricRow
            label="Concentração ecossistemas"
            value={signals.workflow_metrics.ecosystem_concentration.toFixed(2)}
          />
        </dl>
      </section>
    </div>
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

function SignalCard({
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
