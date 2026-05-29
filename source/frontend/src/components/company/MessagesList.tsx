/**
 * Outbound-message overview for the recruiter dashboard.
 *
 * One card per DEVELOPER (grouped by account_id — never two cards for the
 * same dev). The card keeps the original rich layout and previews the dev's
 * most recent message; clicking it opens the details on the contact page
 * (/accounts/:id/contact), where the conversation is split per vaga.
 */
import { useNavigate } from "react-router-dom";

import type { CompanyMessage } from "@/lib/companyDashboardApi";
import { useT, useTp, useFmt } from "@/i18n/I18nProvider";

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

interface DevThread {
  account_id:  number;
  dev_handle:  string;
  bundle_slug: string | null;
  count:       number;
  latest:      CompanyMessage; // mensagem mais recente — prévia do card
}

// Agrupa as mensagens por desenvolvedor (account_id), preservando a ordem de
// primeira aparição. Cada dev vira um único card, com a mensagem mais recente
// como prévia.
function groupByDev(messages: CompanyMessage[]): DevThread[] {
  const order: number[] = [];
  const map = new Map<number, DevThread>();
  for (const m of messages) {
    const thread = map.get(m.account_id);
    if (!thread) {
      map.set(m.account_id, {
        account_id: m.account_id, dev_handle: m.dev_handle,
        bundle_slug: m.bundle_slug, count: 1, latest: m,
      });
      order.push(m.account_id);
      continue;
    }
    thread.count += 1;
    if (!thread.bundle_slug && m.bundle_slug) thread.bundle_slug = m.bundle_slug;
    if (m.sent_at > thread.latest.sent_at) thread.latest = m;
  }
  return order.map((id) => map.get(id)!);
}

export function MessagesList({ messages }: { messages: CompanyMessage[] }) {
  const t = useT();
  if (messages.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        {t("company.messages.empty")}
      </p>
    );
  }

  const threads = groupByDev(messages);
  return (
    <div className="grid gap-4"
         style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {threads.map((thread) => <DevCard key={thread.account_id} thread={thread} />)}
    </div>
  );
}

function DevCard({ thread }: { thread: DevThread }) {
  const t = useT();
  const tp = useTp();
  const fmt = useFmt();
  const { account_id, dev_handle, bundle_slug, count, latest } = thread;
  const m = latest;
  const palette  = STATUS_PALETTE[m.status];
  const navigate = useNavigate();
  const contactPath = `/accounts/${account_id}/contact`;
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
        {bundle_slug
          ? <a href={`/v/${bundle_slug}`} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()}
               style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em",
                        textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3 }}>
              {dev_handle}
            </a>
          : <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {dev_handle}
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
            {t("company.messages.reply_from", { handle: dev_handle })}
          </div>
          <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
                        whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {m.reply_body}
          </div>
        </div>
      )}

      {/* rodapé (mt-auto): contagem de mensagens (quando >1) + ver perfil */}
      <div className="mt-auto flex flex-wrap items-center pt-4" style={{ gap: 8 }}>
        {count > 1 && (
          <span className="font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
            {tp("company.messages.count", count)}
          </span>
        )}
        {bundle_slug && (
          <a href={`/v/${bundle_slug}`} target="_blank" rel="noopener noreferrer"
             onClick={(e) => e.stopPropagation()}
             style={{
               marginLeft: "auto",
               fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
               fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
               color: "var(--text)", textDecoration: "none",
               border: "1px solid var(--rule)", padding: "6px 14px", display: "inline-block",
             }}>
            {t("company.messages.view_profile")}
          </a>
        )}
      </div>
    </div>
  );
}
