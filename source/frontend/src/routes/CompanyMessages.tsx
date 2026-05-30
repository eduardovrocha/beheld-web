/**
 * Dev → company conversation page (`/dashboard/companies/:company`).
 *
 * Mirrors the recruiter's `/accounts/:id/contact` shape — same vocabulary as
 * Directory / AccountContact: FloatingBack top-left, eyebrow + 34px title,
 * two-column grid (esquerda: painel da empresa; direita: card com acordeão
 * de vagas — cada mensagem ganha filete colorido por status e bloco de
 * resposta. Responder/Ignorar disparam refresh do payload).
 *
 * Auth idêntico ao /dashboard: Bearer em sessionStorage; falha de auth
 * limpa o token e volta para "/".
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { FloatingBack } from "@/components/company/FloatingBack";
import { useT, useFmt } from "@/i18n/I18nProvider";
import {
  clearSessionToken,
  getDashboard,
  ignoreMessage,
  respondMessage,
  DashboardAuthError,
  type DashboardPayload,
  type DashboardMessage,
} from "@/lib/dashboardApi";

interface PositionGroup {
  title: string | null;
  msgs:  DashboardMessage[];
}

function groupByPosition(msgs: DashboardMessage[]): PositionGroup[] {
  const order: (string | null)[] = [];
  const map = new Map<string | null, DashboardMessage[]>();
  for (const m of msgs) {
    const key = m.job_title && m.job_title.trim() ? m.job_title : null;
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(m);
  }
  return order.map((title) => ({ title, msgs: map.get(title)! }));
}

const KEY_OF = (g: PositionGroup) => g.title ?? "__none__";

export function CompanyMessages() {
  const t = useT();
  const navigate = useNavigate();
  const { company: rawParam } = useParams<{ company: string }>();
  const company = rawParam ? decodeURIComponent(rawParam) : "";

  const [data, setData]   = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  // Vaga em foco no acordeão — uma aberta por vez. Default: a primeira com
  // pendente (acionável) ou a primeira do histórico.
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await getDashboard();
        if (cancelled) return;
        setData(payload);
        const msgs = payload.messages.filter((m) => m.company === company);
        const groups = groupByPosition(msgs);
        const initial = groups.find((g) => g.msgs.some((m) => m.state === "pending")) ?? groups[0];
        if (initial) setFocusedKey(KEY_OF(initial));
      } catch (e) {
        if (cancelled) return;
        if (e instanceof DashboardAuthError) {
          clearSessionToken();
          navigate("/", { replace: true });
          return;
        }
        setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, company]);

  async function refresh(op: () => Promise<DashboardPayload>) {
    setBusy(true);
    try {
      setData(await op());
    } catch (e) {
      if (e instanceof DashboardAuthError) {
        clearSessionToken();
        navigate("/", { replace: true });
        return;
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <Shell>
        <Header title={company} />
        <Card>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>{error}</p>
        </Card>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <Header title={t("dashboard.loading")} />
      </Shell>
    );
  }

  const msgs = data.messages.filter((m) => m.company === company);

  if (msgs.length === 0) {
    return (
      <Shell>
        <Header title={company} />
        <Card>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            {t("dashboard.messages.conversation.not_found")}
          </p>
          <div style={{ marginTop: 16 }}>
            <Link to="/dashboard#mensagens" style={linkStyle()}>
              {t("dashboard.messages.conversation.back")}
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  const groups = groupByPosition(msgs);
  const pendingCount = msgs.filter((m) => m.state === "pending").length;
  const latest = msgs.reduce((a, b) => (a.sent_at > b.sent_at ? a : b));
  const canRespond = data.account.contact_configured;

  return (
    <Shell>
      <Header title={company} />

      <div className="grid gap-6"
           style={{ gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)", alignItems: "start" }}>
        <CompanyPanel company={company} total={msgs.length} pending={pendingCount}
                      lastAt={latest.sent_at} canRespond={canRespond} />

        <Card>
          <PositionsAccordion groups={groups} openKey={focusedKey} onToggle={setFocusedKey}
                              busy={busy} canRespond={canRespond}
                              onRespond={(id, reply) => refresh(() => respondMessage(id, reply))}
                              onIgnore={(id) => refresh(() => ignoreMessage(id))} />
        </Card>
      </div>
    </Shell>
  );
}

// ── left panel: company summary (mirrors AccountContact's ProfilePanel) ────

function CompanyPanel({ company, total, pending, lastAt, canRespond }: {
  company: string; total: number; pending: number; lastAt: string; canRespond: boolean;
}) {
  const t = useT();
  const fmt = useFmt();
  return (
    <aside style={{
      background: "var(--card-bg)", border: "1px solid var(--rule)",
      padding: 20, position: "sticky", top: 24,
    }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("dashboard.messages.conversation.eyebrow")}
      </div>

      <div className="mt-2" style={{ color: "var(--text)", fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {company}
      </div>

      <div className="mt-2 font-mono"
           style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.02em",
                     fontFeatureSettings: '"tnum"', lineHeight: 1.6 }}>
        <span>{total} {total === 1 ? "mensagem" : "mensagens"}</span>
        {pending > 0 && (
          <> · <span style={{ color: "var(--accent)" }}>{pending} pendente{pending > 1 ? "s" : ""}</span></>
        )}
        <br />
        <span>última {fmt.date(lastAt, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
      </div>

      <p style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--rule-soft)",
                  color: "var(--muted)", fontSize: 12, lineHeight: 1.65 }}>
        {canRespond
          ? "Respondendo, seus contatos (email/telefone) são liberados para esta empresa. Ignorar arquiva sem revelar nada."
          : "Configure seus contatos em Configurações antes de responder. Você ainda pode ignorar mensagens."}
      </p>
    </aside>
  );
}

// ── right card: positions accordion (mirrors AccountContact's PreviousMessages) ─

function PositionsAccordion({ groups, openKey, onToggle, busy, canRespond, onRespond, onIgnore }: {
  groups: PositionGroup[];
  openKey: string | null;
  onToggle: (key: string | null) => void;
  busy: boolean; canRespond: boolean;
  onRespond: (id: string, reply: string) => void;
  onIgnore: (id: string) => void;
}) {
  const t = useT();
  return (
    <div className="grid" style={{ gap: 8 }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 2 }}>
        {t("contact.prev.heading")} · {groups.reduce((n, g) => n + g.msgs.length, 0)}
      </div>

      {groups.map((g) => {
        const key = KEY_OF(g);
        const isOpen = openKey === key;
        return (
          <details key={key} open={isOpen} style={{ border: "1px solid var(--rule)" }}>
            <summary className="font-mono uppercase"
                     onClick={(e) => { e.preventDefault(); onToggle(isOpen ? null : key); }}
                     style={{ cursor: "pointer", listStyle: "none", padding: "9px 12px",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              gap: 8, color: "var(--text)", fontSize: 11, letterSpacing: "0.06em",
                              background: "var(--surface)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {g.title ? t("contact.prev.group", { title: g.title }) : t("contact.prev.group_none")}
              </span>
              <span style={{ color: "var(--muted-soft)", fontFeatureSettings: '"tnum"', flexShrink: 0 }}>
                {g.msgs.length}
              </span>
            </summary>

            <div className="grid" style={{ gap: 12, padding: 12 }}>
              {g.msgs.map((m) => (
                <MessageBlock key={m.id} m={m} busy={busy} canRespond={canRespond}
                              onRespond={(reply) => onRespond(m.id, reply)}
                              onIgnore={() => onIgnore(m.id)} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ── single message: filete colorido por status, corpo, resposta, ações ────

const BORDER_BY_STATE: Record<DashboardMessage["state"], string> = {
  pending:   "var(--muted)",
  responded: "var(--ok)",
  ignored:   "var(--warn)",
};

function MessageBlock({ m, busy, canRespond, onRespond, onIgnore }: {
  m: DashboardMessage; busy: boolean; canRespond: boolean;
  onRespond: (reply: string) => void; onIgnore: () => void;
}) {
  const t = useT();
  const fmt = useFmt();
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState("");

  const fmtDate = (iso: string) => fmt.date(iso, { day: "2-digit", month: "2-digit", year: "numeric" });

  function send() {
    onRespond(reply.trim());
    setComposing(false);
    setReply("");
  }

  return (
    <div style={{ borderLeft: `2px solid ${BORDER_BY_STATE[m.state]}`, paddingLeft: 10 }}>
      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, letterSpacing: "0.04em", marginBottom: 3,
                    fontFeatureSettings: '"tnum"' }}>
        {t("contact.prev.sent", { date: fmtDate(m.sent_at) })}
        {" · "}
        <span style={{ color: BORDER_BY_STATE[m.state] }}>
          {t(`dashboard.messages.status.${m.state}`)}
        </span>
      </div>

      <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
                    whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {m.body}
      </div>

      {m.state === "responded" && m.reply_body && (
        <div className="mt-2" style={{ borderLeft: "2px solid var(--ok)", paddingLeft: 10 }}>
          <div className="font-mono uppercase"
               style={{ color: "var(--ok)", fontSize: 9, letterSpacing: "0.14em", marginBottom: 2 }}>
            {t("dashboard.messages.your_reply")}
          </div>
          <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.5,
                        whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {m.reply_body}
          </div>
        </div>
      )}

      {m.state === "pending" && composing && (
        <div className="mt-3">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                    disabled={busy} rows={4} autoFocus maxLength={2000}
                    placeholder={t("dashboard.messages.reply_placeholder")}
                    style={{
                      width: "100%", font: "inherit", fontSize: 14, lineHeight: 1.55,
                      padding: "10px 12px", color: "var(--text)", background: "var(--bg)",
                      border: "1px solid var(--rule)", borderRadius: 0, outline: "none",
                      resize: "vertical", minHeight: 110,
                      fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
                    }} />
          <div className="mt-2 flex items-center gap-3">
            <PrimaryButton disabled={busy} onClick={send}>
              {t("dashboard.messages.send_reply")}
            </PrimaryButton>
            <button onClick={() => { setComposing(false); setReply(""); }}
                    disabled={busy}
                    style={{
                      background: "none", border: "none", cursor: busy ? "not-allowed" : "pointer",
                      fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                      fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
                      padding: 0,
                    }}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {m.state === "pending" && !composing && (
        <div className="mt-3 flex items-center gap-3">
          <PrimaryButton disabled={busy || !canRespond} onClick={() => setComposing(true)}>
            {t("dashboard.messages.respond")}
          </PrimaryButton>
          <button onClick={onIgnore} disabled={busy}
                  style={{
                    background: "none", border: "none", cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
                    padding: 0,
                  }}>
            {t("dashboard.messages.ignore")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── shell + primitives (mirror AccountContact's local helpers) ────────────

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <FloatingBack back to="/dashboard#mensagens" />
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "64px 32px 96px", color: "var(--text)" }}>
        {children}
      </div>
    </>
  );
}

function Header({ title }: { title: string }) {
  const t = useT();
  return (
    <header className="mb-10">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("dashboard.messages.conversation.eyebrow")}
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        {title}
      </h1>
      <div className="mt-3 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        {t("dashboard.messages.conversation.subtitle")}
      </div>
    </header>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)", padding: 24 }}>
      {children}
    </div>
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
            style={{
              font: "inherit", fontSize: 13,
              padding: "8px 18px",
              background: "var(--text)", color: "var(--bg)",
              border: "1px solid var(--text)",
              borderRadius: 0, letterSpacing: "0.02em",
              cursor: props.disabled ? "not-allowed" : "pointer",
              opacity: props.disabled ? 0.5 : 1,
              ...(props.style ?? {}),
            }} />
  );
}

function linkStyle(): React.CSSProperties {
  return {
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
    textTransform: "uppercase",
    textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
  };
}
