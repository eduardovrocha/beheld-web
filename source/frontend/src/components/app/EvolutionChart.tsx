/**
 * EvolutionChart — 48-column bar chart of bundle publications over the
 * last 90 days.
 *
 * Empty state: 48 dim 6px bars ("the chart exists, it's just empty") +
 * centered overlay teaching `snapshot --publish`. Populated: heights
 * proportional to per-bucket counts; color per band vs the median of
 * non-zero buckets (above = signal, at = ink-3, below = ink-5).
 *
 * Wiring: the real API exposes no daily timeseries endpoint yet, so the
 * buckets are derived client-side from `bundles[].published_at` (each
 * published bundle = one publication event).
 */
import { useMemo } from "react";

import { useT } from "@/i18n/I18nProvider";

const COLS = 48;
const WINDOW_DAYS = 90;
const CHART_PX = 112; // usable bar height inside the 132px track

export function EvolutionChart({ publishedAt }: {
  /** ISO timestamps of published bundles. */
  publishedAt: string[];
}) {
  const t = useT();

  const buckets = useMemo(() => {
    const counts = new Array<number>(COLS).fill(0);
    const now = Date.now();
    const windowMs = WINDOW_DAYS * 86_400_000;
    for (const iso of publishedAt) {
      const ts = new Date(iso).getTime();
      if (Number.isNaN(ts)) continue;
      const age = now - ts;
      if (age < 0 || age >= windowMs) continue;
      // age 0 (today) → last column; age ~90d → first column.
      const col = COLS - 1 - Math.floor((age / windowMs) * COLS);
      counts[Math.max(0, Math.min(COLS - 1, col))] += 1;
    }
    return counts;
  }, [publishedAt]);

  const max = Math.max(...buckets);
  const isEmpty = max === 0;
  const nonZero = buckets.filter((c) => c > 0).sort((a, b) => a - b);
  const median = nonZero.length > 0 ? nonZero[Math.floor(nonZero.length / 2)] : 0;

  return (
    <>
      <div className="evo evo--padleft" aria-hidden="true">
        <div className="evo__yaxis">
          <span>{isEmpty ? 10 : max}</span>
          <span>{isEmpty ? 5 : Math.ceil(max / 2)}</span>
          <span>0</span>
        </div>
        {buckets.map((count, i) => {
          if (isEmpty || count === 0) return <div key={i} className="b" />;
          const band = count > median ? "s3" : count === median ? "s2" : "s1";
          const h = Math.max(6, Math.round((count / max) * CHART_PX));
          return <div key={i} className={`b ${band}`} style={{ height: h }} />;
        })}
      </div>
      <div className="evo__x" style={{ paddingLeft: 40 }}>
        <span>−90d</span><span>−60d</span><span>−30d</span><span>{t("dashboard.evo.today")}</span>
      </div>

      {isEmpty && (
        <div className="empty-overlay">
          <p className="glyph-line" aria-hidden="true">{"░".repeat(COLS)}</p>
          <p>{t("dashboard.evo.empty")}</p>
          <p className="hint">
            {t("dashboard.evo.empty_hint_prefix")}<code>snapshot --publish</code>{t("dashboard.evo.empty_hint_suffix")}
          </p>
        </div>
      )}
    </>
  );
}
