/**
 * Outbound-message overview for the recruiter dashboard.
 *
 * One card per DEVELOPER (never two cards for the same dev). Each card is a
 * collapsible <details>: expanding it reveals the conversation, with the
 * exchanged messages split per position (vaga). Cards with a pending message
 * open by default.
 */
import { Link } from "react-router-dom";

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
  msgs:        CompanyMessage[];
  lastSentAt:  string;
}

// Agrupa as mensagens por desenvolvedor (account_id), preservando a ordem de
// primeira aparição. Cada dev vira um único thread.
function groupByDev(messages: CompanyMessage[]): DevThread[] {
  const order: number[] = [];
  const map = new Map<number, DevThread>();
  for (const m of messages) {
    let thread = map.get(m.account_id);
    if (!thread) {
      thread = { account_id: m.account_id, dev_handle: m.dev_handle,
                 bundle_slug: m.bundle_slug, msgs: [], lastSentAt: m.sent_at };
      map.set(m.account_id, thread);
      order.push(m.account_id);
    }
    thread.msgs.push(m);
    if (m.sent_at > thread.lastSentAt) thread.lastSentAt = m.sent_at;
    if (!thread.bundle_slug && m.bundle_slug) thread.bundle_slug = m.bundle_slug;
  }
  return order.map((id) => map.get(id)!);
}

// Dentro de um thread, separa as mensagens pela vaga (job_title) que originou
// o contato — preservando a ordem de primeira aparição.
function groupByPosition(msgs: CompanyMessage[]): { title: string | null; msgs: CompanyMessage[] }[] {
  const order: (string | null)[] = [];
  const map = new Map<string | null, CompanyMessage[]>();
  for (const m of msgs) {
    const key = m.job_title && m.job_title.trim() ? m.job_title : null;
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(m);
  }
  return order.map((title) => ({ title, msgs: map.get(title)! }));
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
    <div className="grid" style={{ gap: 12 }}>
      {threads.map((thread) => <DevCard key={thread.account_id} thread={thread} />)}
    </div>
  );
}

function DevCard({ thread }: { thread: DevThread }) {
  const t = useT();
  const tp = useTp();
  const fmt = useFmt();
  const { account_id, dev_handle, bundle_slug, msgs } = thread;
  const hasPending = msgs.some((m) => m.status === "pending");
  const positions = groupByPosition(msgs);

  return (
    <details open={hasPending}
             style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      <summary className="flex flex-wrap items-center"
               style={{ cursor: "pointer", listStyle: "none", gap: 8, padding: "14px 18px" }}>
        <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {dev_handle}
        </span>
        <span className="font-mono"
              style={{ marginLeft: "auto", color: "var(--muted-soft)", fontSize: 11,
                       letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
          {tp("company.messages.count", msgs.length)} · {fmt.date(thread.lastSentAt)}
        </span>
      </summary>

      <div style={{ borderTop: "1px solid var(--rule-soft)", padding: 18 }}>
        <div className="grid" style={{ gap: 16 }}>
          {positions.map((g) => (
            <section key={g.title ?? "__none__"}>
              <div className="font-mono uppercase"
                   style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
                {g.title ? t("company.messages.position", { title: g.title }) : t("company.messages.position_none")}
              </div>
              <div className="grid" style={{ gap: 12 }}>
                {g.msgs.map((m) => <MessageRow key={m.id} m={m} handle={dev_handle} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 16 }}>
          <Link to={`/accounts/${account_id}/contact`}
                style={{
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--bg)", background: "var(--text)", textDecoration: "none",
                  border: "1px solid var(--text)", padding: "6px 14px", display: "inline-block",
                }}>
            {t("company.messages.open_contact")}
          </Link>
          {bundle_slug && (
            <a href={`/v/${bundle_slug}`} target="_blank" rel="noopener noreferrer"
               style={{
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
    </details>
  );
}

function MessageRow({ m, handle }: { m: CompanyMessage; handle: string }) {
  const t = useT();
  const fmt = useFmt();
  const palette = STATUS_PALETTE[m.status];
  const statusLabel = t(`company.messages.status.${m.status}`);

  return (
    <div style={{ borderLeft: `2px solid ${palette.fg}`, paddingLeft: 10 }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <span className="font-mono"
              style={{ color: "var(--muted-soft)", fontSize: 11, letterSpacing: "0.04em",
                       fontFeatureSettings: '"tnum"' }}>
          {t("company.messages.sent_at", { date: fmt.date(m.sent_at) })}
          {m.responded_at && <> · {t("company.messages.responded_at", { date: fmt.date(m.responded_at) })}</>}
        </span>
        <span title={statusLabel} aria-label={statusLabel}
              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center",
                       justifyContent: "center", width: 22, height: 22, fontSize: 15,
                       lineHeight: 1, color: palette.fg }}>
          {STATUS_ICON[m.status]}
        </span>
      </div>

      <div className="mt-1" style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
                                     whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {m.body_excerpt}
      </div>

      {m.reply_body && (
        <div className="mt-2" style={{ borderLeft: "2px solid var(--ok)", paddingLeft: 10 }}>
          <div className="font-mono uppercase"
               style={{ color: "var(--ok)", fontSize: 9, letterSpacing: "0.14em", marginBottom: 3 }}>
            {t("company.messages.reply_from", { handle })}
          </div>
          <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
                        whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {m.reply_body}
          </div>
        </div>
      )}
    </div>
  );
}
