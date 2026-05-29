/**
 * Full list of outbound messages this company has sent. Renders as a
 * stack of cards (not <table>) so we keep the hairline+padding rhythm
 * consistent with the rest of the company surfaces.
 */
import { useNavigate } from "react-router-dom";

import type { CompanyMessage } from "@/lib/companyDashboardApi";
import { useT, useFmt } from "@/i18n/I18nProvider";

// Ícone por status — substitui o rótulo textual no chip. O texto continua
// disponível via `title` + `aria-label` (acessibilidade + hover).
const STATUS_ICON: Record<CompanyMessage["status"], string> = {
  pending:   "◷",   // relógio — aguardando
  responded: "✓",   // respondido
  ignored:   "✕",   // ignorado
};

const STATUS_PALETTE: Record<CompanyMessage["status"], { fg: string; bg: string; bd: string }> = {
  pending:   { fg: "var(--muted)", bg: "var(--rule-soft)",       bd: "var(--rule)" },
  responded: { fg: "var(--ok)",    bg: "rgba(74,124,78,0.12)",   bd: "rgba(74,124,78,0.4)" },
  ignored:   { fg: "var(--warn)",  bg: "rgba(181,97,53,0.12)",   bd: "rgba(181,97,53,0.4)" },
};

export function MessagesList({ messages }: { messages: CompanyMessage[] }) {
  const t = useT();
  if (messages.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        {t("company.messages.empty")}
      </p>
    );
  }

  return (
    <div className="grid gap-4"
         style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {messages.map((m) => <MessageCard key={m.id} m={m} />)}
    </div>
  );
}

function MessageCard({ m }: { m: CompanyMessage }) {
  const t = useT();
  const fmt = useFmt();
  const palette  = STATUS_PALETTE[m.status];
  const navigate = useNavigate();
  const contactPath = `/accounts/${m.account_id}/contact`;
  const statusLabel = t(`company.messages.status.${m.status}`);

  return (
    <div role="button" tabIndex={0}
         onClick={() => navigate(contactPath)}
         onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(contactPath); } }}
         style={{
           display: "flex", flexDirection: "column",
           background: "var(--card-bg)", border: "1px solid var(--rule)",
           padding: 18, minHeight: 196, cursor: "pointer",
           transition: "border-color 120ms ease",
         }}
         onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
         onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}>
      {/* header: handle (link) + status chip — mesmo layout do #devs */}
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        {m.bundle_slug
          ? <a href={`/v/${m.bundle_slug}`} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()}
               style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em",
                        textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3 }}>
              {m.dev_handle}
            </a>
          : <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {m.dev_handle}
            </span>}
        <span title={statusLabel} aria-label={statusLabel}
              style={{
                marginLeft: "auto",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, fontSize: 17, lineHeight: 1,
                color: palette.fg,
              }}>
          {STATUS_ICON[m.status]}
        </span>
      </div>

      {m.job_title && (
        <div className="mt-1" style={{ color: "var(--muted)", fontSize: 13 }}>{m.job_title}</div>
      )}

      <div className="mt-3" style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55 }}>
        {m.body_excerpt}
      </div>

      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 8,
                     letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        {t("company.messages.sent_at", { date: fmt.date(m.sent_at) })}
        {m.responded_at && <> · {t("company.messages.responded_at", { date: fmt.date(m.responded_at) })}</>}
      </div>

      {/* resposta do dev (F_REPLY) — bloco com filete de acento à esquerda */}
      {m.reply_body && (
        <div className="mt-3" style={{ borderLeft: "2px solid var(--ok)", paddingLeft: 10 }}>
          <div className="font-mono uppercase"
               style={{ color: "var(--ok)", fontSize: 9, letterSpacing: "0.14em", marginBottom: 3 }}>
            {t("company.messages.reply_from", { handle: m.dev_handle })}
          </div>
          <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
                        whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {m.reply_body}
          </div>
        </div>
      )}

      {/* ações ancoradas no rodapé (mt-auto), como no #devs */}
      {m.bundle_slug && (
        <div className="mt-auto flex flex-wrap items-center pt-4" style={{ gap: 8 }}>
          <a href={`/v/${m.bundle_slug}`} target="_blank" rel="noopener noreferrer"
             onClick={(e) => e.stopPropagation()}
             style={{
               fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
               fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
               color: "var(--text)", textDecoration: "none",
               border: "1px solid var(--rule)", padding: "6px 14px", display: "inline-block",
             }}>
            {t("company.messages.view_profile")}
          </a>
        </div>
      )}
    </div>
  );
}
