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
    <ul style={{ listStyle: "none", margin: 0, padding: 0,
                 background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      {events.map((e, i) => (
        <li key={`${e.type}-${e.at}-${i}`} style={rowStyle(i === 0)}>
          <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: 14, width: 16, display: "inline-block" }}>
            {e.type === "verification" ? "↗" : "✉"}
          </span>
          <div className="flex-1 min-w-0">
            <div style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.5 }}>
              {e.bundle_slug ? (
                <a href={`/v/${e.bundle_slug}`} style={inlineLink()}>{e.dev_handle ?? "—"}</a>
              ) : (
                <span>{e.dev_handle ?? "—"}</span>
              )}
              {e.job_title && (
                <span style={{ color: "var(--muted)" }}> · {e.job_title}</span>
              )}
              {e.status && (
                <span className="font-mono uppercase"
                      style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.12em", marginLeft: 8 }}>
                  · {STATUS_LABEL[e.status]}
                </span>
              )}
            </div>
          </div>
          <span style={{ color: "var(--muted-soft)", fontSize: 12, fontFeatureSettings: '"tnum"' }}>
            {formatDateTime(e.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function rowStyle(first: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "20px 1fr auto",
    alignItems: "baseline",
    gap: 12,
    padding: "12px 16px",
    borderTop: first ? "none" : "1px solid var(--rule-soft)",
  };
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
