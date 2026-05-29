/**
 * Recruiter → dev contact form (`/accounts/:account_id/contact`).
 *
 * Same vocabulary as Directory / CompaniesNew: numbered section header,
 * white card with hairline, mono uppercase field labels, Switzer body.
 *
 * Auth via signed company cookie. 401 → bounce to /companies/new.
 * 404 from the API (opt-out / no bundle) → permanent unavailable state.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { FloatingBack } from "@/components/company/FloatingBack";
import { CompanyNav } from "@/components/company/CompanyNav";
import { Tooltip } from "@/components/Tooltip";
import { VerifiedIcon } from "@/components/icons";
import {
  loadContactTarget,
  sendContact,
  ContactAuthError,
  ContactUnavailableError,
  type ContactTarget,
  type ContactPreviousMessage,
} from "@/lib/contactsApi";
import { getPositions, type Position } from "@/lib/companyDashboardApi";
import { Dropdown } from "@/components/Dropdown";
import { useT, useFmt } from "@/i18n/I18nProvider";

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; target: ContactTarget["account"] }
  | { kind: "unavailable" }
  | { kind: "sending"; target: ContactTarget["account"] }
  | { kind: "sent"; handle: string };

export function AccountContact() {
  const t = useT();
  const { account_id } = useParams<{ account_id: string }>();
  const navigate = useNavigate();

  const [phase, setPhase]       = useState<Phase>({ kind: "loading" });
  const [jobTitle, setJobTitle] = useState("");
  const [body, setBody]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [prevMessages, setPrevMessages] = useState<ContactPreviousMessage[]>([]);
  // Vaga em foco no acordeão de mensagens anteriores. "__none__" = grupo sem
  // vaga; null = nenhum aberto. O campo travado "Cargo da vaga" espelha isto.
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  // Vagas cadastradas da empresa, pra preencher o dropdown de "Cargo da vaga".
  // Fire-and-forget: se falhar, o campo cai no input de texto livre.
  useEffect(() => {
    getPositions().then(setPositions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!account_id) { setPhase({ kind: "unavailable" }); return; }
    (async () => {
      try {
        const ct = await loadContactTarget(account_id);
        setPhase({ kind: "ready", target: ct.account });
        const prev = ct.previous_messages ?? [];
        setPrevMessages(prev);
        // Se já há uma mensagem PENDENTE, o contato fica atrelado à vaga dela —
        // fixamos o jobTitle e travamos o seletor (ver `vagaLocked` no render).
        const pending = prev.find((m) => m.status === "pending");
        if (pending) setJobTitle(pending.job_title ?? "");
        // Vaga aberta por padrão no acordeão: a pendente (acionável), senão a
        // primeira do histórico. O campo travado segue essa vaga em foco.
        const groups = groupByPosition(prev);
        const initial = groups.find((g) => g.msgs.some((m) => m.status === "pending")) ?? groups[0];
        if (initial) setFocusedKey(initial.title ?? "__none__");
      } catch (e) {
        if (e instanceof ContactAuthError)         navigate("/companies/new", { replace: true });
        else if (e instanceof ContactUnavailableError) setPhase({ kind: "unavailable" });
        else                                       setError((e as Error).message);
      }
    })();
  }, [account_id, navigate]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase.kind !== "ready") return;
    setError(null);
    const target = phase.target;
    setPhase({ kind: "sending", target });

    try {
      const result = await sendContact(account_id!, {
        job_title: jobTitle.trim(),
        body:      body.trim(),
      });
      if (result.ok) {
        setPhase({ kind: "sent", handle: target.handle });
      } else {
        setError(result.message);
        setPhase({ kind: "ready", target });
      }
    } catch (e) {
      if (e instanceof ContactAuthError)              navigate("/companies/new", { replace: true });
      else if (e instanceof ContactUnavailableError)  setPhase({ kind: "unavailable" });
      else {
        setError((e as Error).message);
        setPhase({ kind: "ready", target });
      }
    }
  }

  if (phase.kind === "loading") {
    return (
      <Shell>
        <Header title={t("contact.loading")} />
      </Shell>
    );
  }

  if (phase.kind === "unavailable") {
    return (
      <Shell>
        <Header title={t("contact.unavailable.title")} emTail={t("contact.unavailable.em_tail")} />
        <Card>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            {t("contact.unavailable.body")}
          </p>
          <div style={{ marginTop: 16 }}>
            <Link to="/directory" style={linkStyle()}>{t("contact.unavailable.back")}</Link>
          </div>
        </Card>
      </Shell>
    );
  }

  if (phase.kind === "sent") {
    return (
      <Shell>
        <Header title={t("contact.sent.title")} emTail={t("contact.sent.em_tail")} />
        <Card>
          <p style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.7 }}>
            {t("contact.sent.body_prefix")}<strong style={{ color: "var(--accent)" }}>{phase.handle}</strong>{t("contact.sent.body_suffix")}
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
            {t("contact.sent.note_prefix")}<span style={{ color: "var(--text)" }}>{t("contact.action_respond")}</span>{t("contact.sent.note_suffix")}
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <Link to="/directory" style={primaryLinkStyle()}>{t("contact.sent.back")}</Link>
          </div>
        </Card>
      </Shell>
    );
  }

  const target = phase.target;
  const sending = phase.kind === "sending";
  const openPositions = positions.filter((p) => !p.archived);
  // Há contato pendente (enviado, sem resposta) → a vaga não pode mudar.
  const vagaLocked = prevMessages.some((m) => m.status === "pending");
  // Título da vaga em foco no acordeão (null quando o grupo "sem vaga" ou nada).
  const focusedTitle = focusedKey && focusedKey !== "__none__" ? focusedKey : null;
  // Ao trocar a vaga em foco, o campo travado acompanha (e, travado, é o que
  // será enviado — você continua a conversa daquela vaga).
  const focusVaga = (key: string | null) => {
    setFocusedKey(key);
    if (vagaLocked) setJobTitle(key && key !== "__none__" ? key : "");
  };

  return (
    <Shell>
      <Header title={t("contact.title")}
              emTail={t("contact.em_tail", { handle: target.handle })}
              meta={<CompanyNav bare />} />

      <div className="grid gap-6"
           style={{ gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)", alignItems: "start" }}>
        {/* ── esquerda: perfil a ser contatado ── */}
        <ProfilePanel target={target} />

        {/* ── direita: box de mensagem ── */}
        <Card>
          {prevMessages.length > 0 && (
            <PreviousMessages items={prevMessages} openKey={focusedKey} onToggle={focusVaga} />
          )}
          <form onSubmit={handleSubmit} className="grid gap-5">
            {error && (
              <div style={{
                padding: "10px 14px",
                background: "rgba(181,97,53,0.08)",
                border: "1px solid rgba(181,97,53,0.35)",
                color: "var(--warn)", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <Field label={t("contact.form.job_title_label")}
                   hint={vagaLocked ? t("contact.form.job_title_hint_locked") : t("contact.form.job_title_hint")}>
              {vagaLocked ? (
                <div style={{
                  font: "inherit", fontSize: 14, padding: "10px 12px",
                  color: "var(--muted)", background: "var(--surface)",
                  border: "1px solid var(--rule)", cursor: "not-allowed",
                }}>
                  {focusedTitle || jobTitle || t("contact.form.no_position")}
                </div>
              ) : openPositions.length > 0 ? (
                <Dropdown
                  value={jobTitle}
                  onChange={setJobTitle}
                  disabled={sending}
                  options={[
                    { value: "", label: t("contact.form.select_position") },
                    ...openPositions.map((p) => ({ value: p.title, label: p.title })),
                  ]} />
              ) : (
                <Input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                       autoComplete="off" disabled={sending} />
              )}
            </Field>

            <Field label={t("contact.form.message_label")} hint={t("contact.form.message_hint")}>
              <textarea value={body} onChange={(e) => setBody(e.target.value)}
                        required disabled={sending}
                        rows={8}
                        style={{
                          font: "inherit", fontSize: 14,
                          padding: "10px 12px",
                          color: "var(--text)", background: "var(--bg)",
                          border: "1px solid var(--rule)",
                          borderRadius: 0, outline: "none",
                          resize: "vertical", minHeight: 160,
                          fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
                          lineHeight: 1.55,
                        }} />
            </Field>

            <div className="flex items-center justify-between gap-4 pt-2">
              <Link to="/directory" style={linkStyle()}>{t("contact.form.back")}</Link>
              <PrimaryButton type="submit" disabled={sending}>
                {sending ? t("contact.form.submitting") : t("contact.form.submit")}
              </PrimaryButton>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}

// Coluna esquerda: cartão do dev a ser contatado. Só dados públicos
// (handle, status, test ratio, ecosystems, link pro retrato) + a nota de
// privacidade. Nunca email/telefone.
function ProfilePanel({ target }: { target: ContactTarget["account"] }) {
  const t = useT();
  const fmt = useFmt();
  const slug = target.bundle_slug;
  return (
    <aside style={{
      background: "var(--card-bg)", border: "1px solid var(--rule)",
      padding: 20, position: "sticky", top: 24,
    }}>
      {/* selo de verificação — ícone no canto superior direito do card */}
      {target.status === "verified" && (
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <Tooltip
            tone="ok"
            align="right"
            icon={<VerifiedIcon size={12} />}
            label={t("common.verified.label")}
            title={t("common.verified.title")}
            description={t("contact.profile.verified_desc")}>
            <span aria-label={t("common.verified.aria")}
                  style={{ display: "inline-flex", alignItems: "center", color: "var(--ok)", cursor: "help" }}>
              <VerifiedIcon size={18} />
            </span>
          </Tooltip>
        </div>
      )}

      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("contact.profile.eyebrow")}
      </div>

      <div className="mt-2 flex flex-wrap items-center" style={{ gap: 6, paddingRight: 24 }}>
        {slug
          ? <a href={`/v/${slug}`} target="_blank" rel="noopener noreferrer"
               style={{ color: "var(--text)", fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em",
                        textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3 }}>
              {target.handle}
            </a>
          : <span style={{ color: "var(--text)", fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {target.handle}
            </span>}
        {target.status === "outdated" && <StatusBadge kind="warn">{t("common.bundle_status.outdated")}</StatusBadge>}
      </div>

      {(typeof target.test_ratio === "number" || target.last_bundle_at) && (
        <div className="mt-2 font-mono"
             style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.02em",
                       fontFeatureSettings: '"tnum"', lineHeight: 1.6 }}>
          {typeof target.test_ratio === "number" && (
            <span>{t("directory.card.test_ratio_label")} <strong style={{ color: "var(--accent)" }}>{Math.round(target.test_ratio)}%</strong></span>
          )}
          {target.last_bundle_at && <span> · {t("directory.card.published", { date: fmt.date(target.last_bundle_at, { month: "short", year: "numeric" }) })}</span>}
        </div>
      )}

      {target.ecosystems && target.ecosystems.length > 0 && (
        <div className="mt-3 flex flex-wrap" style={{ gap: 5 }}>
          {target.ecosystems.slice(0, 6).map((eco) => (
            <span key={eco} style={{
              display: "inline-block", padding: "2px 9px", fontSize: 11.5,
              background: "var(--rule-soft)", color: "var(--text)", border: "1px solid var(--rule)",
            }}>{eco}</span>
          ))}
        </div>
      )}

      <p style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--rule-soft)",
                  color: "var(--muted)", fontSize: 12, lineHeight: 1.65 }}>
        {t("contact.profile.privacy_prefix")}<span style={{ color: "var(--text)" }}>{target.handle}</span>{t("contact.profile.privacy_mid")}<span style={{ color: "var(--text)" }}>{t("contact.action_respond")}</span>{t("contact.profile.privacy_suffix")}
      </p>
    </aside>
  );
}

function StatusBadge({ kind, children }: { kind: "ok" | "warn"; children: ReactNode }) {
  const c = kind === "ok"
    ? { bg: "rgba(74,124,78,0.12)", fg: "var(--ok)",   bd: "rgba(74,124,78,0.4)" }
    : { bg: "rgba(181,97,53,0.12)", fg: "var(--warn)", bd: "rgba(181,97,53,0.4)" };
  return (
    <span className="font-mono uppercase"
          style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
                   padding: "2px 8px", fontSize: 9, letterSpacing: "0.12em" }}>
      {children}
    </span>
  );
}

// ── shell + primitives (kept local to keep this route self-contained) ──────

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <FloatingBack back to="/directory" />
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "64px 32px 96px", color: "var(--text)" }}>
        {children}
      </div>
    </>
  );
}

function Header({ title, emTail, meta }: { title: string; emTail?: string; meta?: ReactNode }) {
  const t = useT();
  return (
    <header className="mb-10">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("contact.eyebrow")}
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        {title}
        {emTail && <span style={{ color: "var(--muted)", fontWeight: 400 }}> {emTail}</span>}
      </h1>
      {meta && (
        <div className="mt-3 flex flex-wrap items-baseline gap-3 font-mono"
             style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
          {meta}
        </div>
      )}
    </header>
  );
}

// Mensagens que esta empresa já enviou a este dev — contexto antes de mandar
// outra. As pendentes (sem resposta) ganham destaque; as respondidas mostram
// a resposta do dev.
// Agrupa as mensagens anteriores pela vaga que originou cada contato. Cada
// vaga vira um <details> colapsável; abrir revela a conversa (mensagem +
// resposta do dev). Grupos com mensagem pendente abrem por padrão.
function groupByPosition(items: ContactPreviousMessage[]): { title: string | null; msgs: ContactPreviousMessage[] }[] {
  const order: (string | null)[] = [];
  const map = new Map<string | null, ContactPreviousMessage[]>();
  for (const m of items) {
    const key = m.job_title && m.job_title.trim() ? m.job_title : null;
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(m);
  }
  return order.map((title) => ({ title, msgs: map.get(title)! }));
}

// Acordeão controlado pelo pai: `openKey` é a vaga aberta (só uma por vez) e
// `onToggle` reporta a troca — o pai usa isso para espelhar a vaga em foco no
// campo travado "Cargo da vaga".
function PreviousMessages({ items, openKey, onToggle }: {
  items: ContactPreviousMessage[];
  openKey: string | null;
  onToggle: (key: string | null) => void;
}) {
  const t = useT();
  const fmtI18n = useFmt();
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return fmtI18n.date(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const groups = groupByPosition(items);
  const keyOf = (g: { title: string | null }) => g.title ?? "__none__";
  return (
    <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--rule-soft)" }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 10 }}>
        {t("contact.prev.heading")} · {items.length}
      </div>

      <div className="grid" style={{ gap: 8 }}>
        {groups.map((g) => {
          const key = keyOf(g);
          const isOpen = openKey === key;
          return (
            <details key={key} open={isOpen}
                     style={{ border: "1px solid var(--rule)" }}>
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

              <div className="grid" style={{ gap: 12, padding: "12px" }}>
                {g.msgs.map((m) => {
                  const pending = m.status === "pending";
                  return (
                    <div key={m.id}
                         style={{ borderLeft: `2px solid ${pending ? "var(--muted)" : m.status === "responded" ? "var(--ok)" : "var(--warn)"}`,
                                  paddingLeft: 10 }}>
                      <div className="font-mono"
                           style={{ color: "var(--muted-soft)", fontSize: 11, letterSpacing: "0.04em", marginBottom: 3,
                                    fontFeatureSettings: '"tnum"' }}>
                        {t("contact.prev.sent", { date: fmt(m.sent_at) })}
                        {" · "}
                        <span style={{ color: pending ? "var(--muted)" : m.status === "responded" ? "var(--ok)" : "var(--warn)" }}>
                          {pending ? t("contact.prev.status_pending") : m.status === "responded" ? t("contact.prev.status_responded") : t("contact.prev.status_ignored")}
                        </span>
                      </div>
                      <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
                                    whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {m.body}
                      </div>
                      {m.reply_body && (
                        <div className="mt-2" style={{ borderLeft: "2px solid var(--ok)", paddingLeft: 10 }}>
                          <div className="font-mono uppercase" style={{ color: "var(--ok)", fontSize: 9, letterSpacing: "0.14em", marginBottom: 2 }}>
                            {t("contact.prev.reply_heading")}
                          </div>
                          <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {m.reply_body}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)", padding: 24 }}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
        {label}
        {hint && <span style={{ color: "var(--muted-soft)", letterSpacing: 0, textTransform: "none" }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
           style={{
             font: "inherit", fontSize: 14,
             padding: "10px 12px",
             color: "var(--text)", background: "var(--bg)",
             border: "1px solid var(--rule)",
             borderRadius: 0, outline: "none",
             ...(props.style ?? {}),
           }} />
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

function primaryLinkStyle(): React.CSSProperties {
  return {
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 11, color: "var(--bg)", letterSpacing: "0.14em",
    textTransform: "uppercase",
    background: "var(--text)", border: "1px solid var(--text)",
    padding: "6px 14px",
    textDecoration: "none",
  };
}
