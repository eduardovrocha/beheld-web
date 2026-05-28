/**
 * Interleaved feed of verifications + outbound messages, newest first.
 * Verifications get ↗ (looked up), messages get ✉ (sent).
 */
import { Link } from "react-router-dom";

import type { ActivityEvent } from "@/lib/companyDashboardApi";

const STATUS_LABEL: Record<NonNullable<ActivityEvent["status"]>, string> = {
  pending:   "aguardando",
  responded: "respondido",
  ignored:   "ignorado",
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        Nenhuma atividade ainda. Acesse o <Link to="/directory" style={inlineLink()}>diretório</Link> para começar.
      </p>
    );
  }

  return (
    <div className="grid gap-4"
         style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {events.map((e, i) => (
        <ActivityCard key={`${e.type}-${e.at}-${i}`} event={e} />
      ))}
    </div>
  );
}

function ActivityCard({ event: e }: { event: ActivityEvent }) {
  const isVerification = e.type === "verification";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--card-bg)", border: "1px solid var(--rule)",
      padding: 16,
    }}>
      {/* tipo + timestamp */}
      <div className="flex items-center justify-between">
        <span className="font-mono uppercase"
              style={{ color: "var(--accent)", fontSize: 9, letterSpacing: "0.14em" }}>
          {isVerification ? "↗ verificação" : "✉ mensagem"}
        </span>
        <span className="font-mono"
              style={{ color: "var(--muted-soft)", fontSize: 11, fontFeatureSettings: '"tnum"' }}>
          {formatDateTime(e.at)}
        </span>
      </div>

      {/* dev handle */}
      <div className="mt-2" style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {e.bundle_slug ? (
          <a href={`/v/${e.bundle_slug}`} target="_blank" rel="noopener noreferrer" style={inlineLink()}>
            {e.dev_handle ?? "—"}
          </a>
        ) : (
          <span>{e.dev_handle ?? "—"}</span>
        )}
      </div>

      {/* job title + status */}
      {(e.job_title || e.status) && (
        <div className="mt-1 flex flex-wrap items-center" style={{ gap: 8 }}>
          {e.job_title && <span style={{ color: "var(--muted)", fontSize: 13 }}>{e.job_title}</span>}
          {e.status && (
            <span className="font-mono uppercase"
                  style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.12em",
                            padding: "2px 8px", background: "var(--rule-soft)", border: "1px solid var(--rule)" }}>
              {STATUS_LABEL[e.status]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function inlineLink(): React.CSSProperties {
  return {
    color: "var(--accent)",
    textDecoration: "underline",
    textDecorationColor: "var(--rule)",
    textUnderlineOffset: 3,
  };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
