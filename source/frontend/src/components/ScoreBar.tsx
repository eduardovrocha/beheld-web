interface Props {
  label: string;
  value: number;
  max?: number;
}

function colorClass(value: number): string {
  if (value >= 80) return "bg-score-excellent";
  if (value >= 60) return "bg-score-good";
  if (value >= 40) return "bg-score-fair";
  if (value >= 20) return "bg-score-poor";
  return "bg-score-bad";
}

export function ScoreBar({ label, value, max = 100 }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-40 shrink-0 text-sm text-slate-300">{label}</div>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full ${colorClass(value)} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="w-12 shrink-0 text-right font-mono text-sm tabular-nums">
        {value}
      </div>
    </div>
  );
}
