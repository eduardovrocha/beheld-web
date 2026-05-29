/**
 * Four-card stats row. Pure-data tone — no copy that celebrates numbers.
 * Same visual vocabulary as Home's `Glance` cards.
 */
import type { ReactNode } from "react";

import type { DashboardStats } from "@/lib/companyDashboardApi";
import { useT } from "@/i18n/I18nProvider";

export function StatsGrid({ stats }: { stats: DashboardStats | null }) {
  const t = useT();
  if (!stats) return null;

  return (
    <div className="grid gap-4"
         style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      <StatCard label={t("company.stats.verifications")}
                value={stats.verifications_total} />
      <StatCard label={t("company.stats.messages_sent")}
                value={stats.messages_total} />
      <StatCard label={t("company.stats.responded")}
                value={stats.response_rate != null ? `${stats.response_rate}%` : "—"}
                hint={t("company.stats.responded_hint", { responded: stats.messages_responded, total: stats.messages_total })} />
      <StatCard label={t("company.stats.saved_devs")}
                value={stats.saved_devs_total} />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}>
        {label}
      </div>
      <div className="mb-1 font-semibold"
           style={{ color: "var(--text)", fontSize: 24, letterSpacing: "-0.025em", lineHeight: 1 }}>
        {value}
      </div>
      {hint && (
        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.6, fontFeatureSettings: '"tnum"' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
