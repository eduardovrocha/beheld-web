/**
 * Full list of outbound messages this company has sent. Renders as a
 * stack of cards (not <table>) so we keep the hairline+padding rhythm
 * consistent with the rest of the company surfaces.
 */
import type { CompanyMessage } from "@/lib/companyDashboardApi";

const STATUS_LABEL: Record<CompanyMessage["status"], string> = {
  pending:   "aguardando resposta",
  responded: "respondido",
  ignored:   "ignorado",
};

const STATUS_PALETTE: Record<CompanyMessage["status"], { fg: string; bg: string; bd: string }> = {
  pending:   { fg: "var(--muted)", bg: "var(--rule-soft)",       bd: "var(--rule)" },
  responded: { fg: "var(--ok)",    bg: "rgba(74,124,78,0.12)",   bd: "rgba(74,124,78,0.4)" },
  ignored:   { fg: "var(--warn)",  bg: "rgba(181,97,53,0.12)",   bd: "rgba(181,97,53,0.4)" },
};

export function MessagesList({ messages }: { messages: CompanyMessage[] }) {
  if (messages.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        Nenhuma mensagem enviada ainda.
      </p>
    );
  }

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      {messages.map((m, i) => <MessageRow key={m.id} m={m} first={i === 0} />)}
    </div>
  );
}

function MessageRow({ m, first }: { m: CompanyMessage; first: boolean }) {
  const palette = STATUS_PALETTE[m.status];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 16, padding: "14px 16px",
      borderTop: first ? "none" : "1px solid var(--rule-soft)",
      alignItems: "start",
    }}>
      <div>
        <div style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.55 }}>
          {m.dev_handle}
          {m.job_title && <span style={{ color: "var(--muted)" }}> · {m.job_title}</span>}
          <span className="font-mono uppercase"
                style={{
                  marginLeft: 8, padding: "2px 8px",
                  fontSize: 9, letterSpacing: "0.12em",
                  background: palette.bg, color: palette.fg, border: `1px solid ${palette.bd}`,
                }}>
            {STATUS_LABEL[m.status]}
          </span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, lineHeight: 1.55 }}>
          {m.body_excerpt}
        </div>
        <div className="font-mono"
             style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 6,
                       letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
          enviada {formatDate(m.sent_at)}
          {m.responded_at && <> · respondida {formatDate(m.responded_at)}</>}
        </div>
      </div>
      <div className="flex flex-shrink-0">
        {m.bundle_slug && (
          <a href={`/v/${m.bundle_slug}`}
             style={{
               fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
               fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
               color: "var(--text)", textDecoration: "none",
               border: "1px solid var(--rule)", padding: "5px 10px",
             }}>
            ver perfil →
          </a>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
