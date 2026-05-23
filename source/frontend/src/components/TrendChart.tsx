/**
 * TrendChart — inline SVG multi-line chart for the 12-month trajectory.
 *
 * No external chart deps; viewBox-based so it scales to its container.
 * Five series stacked in a single SVG with shared axes:
 *   - Overall (emerald, thick)
 *   - Prompt Quality / Test Maturity / Tech Breadth / Growth Rate (thinner)
 */
import { useMemo } from "react";

import type { ScoreSnapshot } from "@/lib/trendHistory";

const SERIES = [
  { key: "overall", labelKey: "profile.trend.legend.overall", color: "#10b981", width: 2.5 },
  { key: "prompt_quality", labelKey: "profile.trend.legend.prompt", color: "#6366f1", width: 1.5 },
  { key: "test_maturity", labelKey: "profile.trend.legend.test", color: "#f59e0b", width: 1.5 },
  { key: "tech_breadth", labelKey: "profile.trend.legend.breadth", color: "#94a3b8", width: 1.5 },
  { key: "growth_rate", labelKey: "profile.trend.legend.growth", color: "#0ea5e9", width: 1.5 },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

const W = 600;
const H = 200;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

function xFor(i: number, n: number) {
  const range = W - PAD_LEFT - PAD_RIGHT;
  return PAD_LEFT + (i / Math.max(1, n - 1)) * range;
}

function yFor(score: number) {
  const range = H - PAD_TOP - PAD_BOTTOM;
  return PAD_TOP + (1 - score / 100) * range;
}

function linePath(snaps: ScoreSnapshot[], key: SeriesKey) {
  return snaps
    .map((s, i) => {
      const x = xFor(i, snaps.length);
      const y = yFor(s[key]);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function monthShort(date: string): string {
  // date is "YYYY-MM"
  const [, mm] = date.split("-");
  const idx = Math.max(0, Math.min(11, Number(mm) - 1));
  return [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ][idx];
}

export function TrendChart({
  snapshots,
  legendLabels,
}: {
  snapshots: ScoreSnapshot[];
  legendLabels: Record<string, string>;
}) {
  const paths = useMemo(
    () =>
      SERIES.map((s) => ({
        ...s,
        d: linePath(snapshots, s.key),
      })),
    [snapshots],
  );

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-56 w-full"
        aria-hidden="true"
      >
        {/* gridlines */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={PAD_LEFT - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500"
              style={{ fontSize: 9, fontFamily: "ui-monospace, monospace" }}
            >
              {t}
            </text>
          </g>
        ))}

        {/* x-axis labels: every other month to avoid clutter */}
        {snapshots.map((s, i) =>
          i % 2 === 0 || i === snapshots.length - 1 ? (
            <text
              key={s.date}
              x={xFor(i, snapshots.length)}
              y={H - 6}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500"
              style={{ fontSize: 9, fontFamily: "ui-monospace, monospace" }}
            >
              {monthShort(s.date)}
            </text>
          ) : null,
        )}

        {/* lines */}
        {paths.map((p) => (
          <path
            key={p.key}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={p.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* endpoint dot on Overall */}
        {snapshots.length > 0 ? (
          <circle
            cx={xFor(snapshots.length - 1, snapshots.length)}
            cy={yFor(snapshots[snapshots.length - 1].overall)}
            r={3.5}
            fill="#10b981"
          />
        ) : null}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {SERIES.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-400"
          >
            <span
              className="inline-block w-4 rounded-sm"
              style={{ background: s.color, height: s.width + 1 }}
            />
            <span>{legendLabels[s.labelKey] ?? s.labelKey}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
