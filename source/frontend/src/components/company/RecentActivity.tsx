/**
 * Interleaved feed of verifications + outbound messages, newest first.
 * Verifications get ↗ (looked up), messages get ✉ (sent).
 */
import { Link } from "react-router-dom";

import type { ActivityEvent } from "@/lib/companyDashboardApi";
import { useT, useFmt } from "@/i18n/I18nProvider";

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  const t = useT();
  if (events.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        {t("company.activity.empty_prefix")}
        <Link to="/directory" style={inlineLink()}>{t("company.activity.empty_link")}</Link>
        {t("company.activity.empty_suffix")}
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
  const t = useT();
  const fmt = useFmt();
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
          {t(isVerification ? "company.activity.verification" : "company.activity.message")}
        </span>
        <span className="font-mono"
              style={{ color: "var(--muted-soft)", fontSize: 11, fontFeatureSettings: '"tnum"' }}>
          {`${fmt.date(e.at)} · ${fmt.time(e.at)}`}
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
              {t(`company.activity.status.${e.status}`)}
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

