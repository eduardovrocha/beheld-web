/**
 * /accounts/:account_id/contact — recruiter → dev compose-message screen,
 * app-shell v2 (design_handoff_contato). Renders OUTSIDE <Layout>; reuses
 * CompanyShell (page="contact": Mensagens marcado na sidebar) with a
 * narrow 880px single-column main — focused-task screen, not a dashboard.
 *
 *   ← voltar · page header (1-col) · <DevProfileCompact> · <Callout>
 *   histórico pinado por vaga · <form> Nova mensagem
 *
 * Wiring (handoff "Data Sources & Wiring", adaptado à API real):
 *   - perfil + histórico → GET /api/v1/accounts/:id/contact (contactsApi —
 *     um payload só; não existe /directory/:handle/preview)
 *   - vagas ativas       → GET /api/v1/company/positions
 *   - envio              → POST /api/v1/accounts/:id/contact
 *     (a API usa `job_title` texto — o hidden input carrega o título, não
 *     um position_id)
 *   - nome da empresa (crumb) → /directory, fetch silencioso
 *
 * Estados (handoff §States): A primeira mensagem (sem histórico, select
 * aberto); B thread pendente → vaga FIXADA (.pinned-pos). Pré-seleção via
 * `?position=<título>` (os links Contatar dos matches passam isso).
 * Sucesso → redirect pra /company/dashboard#mensagens.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { PageHeader, ShellButton } from "@/components/app/PageHeader";
import { Callout } from "@/components/company/Callout";
import { CompanyShell } from "@/components/company/CompanyShell";
import { DevProfileCompact } from "@/components/company/DevProfileCompact";
import { useT, useFmt } from "@/i18n/I18nProvider";
import type { Formatters } from "@/i18n/format";
import {
  loadContactTarget,
  sendContact,
  ContactAuthError,
  ContactUnavailableError,
  type ContactTarget,
  type ContactPreviousMessage,
} from "@/lib/contactsApi";
import { getPositions, type Position, type PositionSignal } from "@/lib/companyDashboardApi";
import { getDirectory } from "@/lib/directoryApi";

import "@/styles/app-shell.css";
import "@/styles/app-company.css";
import "@/styles/app-contact.css";

const MIN_BODY = 30;
const MAX_BODY = 800;

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; target: ContactTarget["account"] }
  | { kind: "unavailable" }
  | { kind: "sending"; target: ContactTarget["account"] };

export function AccountContact() {
  const t = useT();
  const { account_id } = useParams<{ account_id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [prevMessages, setPrevMessages] = useState<ContactPreviousMessage[]>([]);
  const [jobTitle, setJobTitle] = useState(() => params.get("position") ?? "");
  const [body, setBody] = useState("");
  const [company, setCompany] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("app-v2-page");
    return () => document.documentElement.classList.remove("app-v2-page");
  }, []);

  // Chrome-only fetches (fire-and-forget).
  useEffect(() => {
    getPositions().then(setPositions).catch(() => {});
    getDirectory().then((p) => setCompany(p.company.name)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!account_id) { setPhase({ kind: "unavailable" }); return; }
    let cancelled = false;
    (async () => {
      try {
        const ct = await loadContactTarget(account_id);
        if (cancelled) return;
        setPhase({ kind: "ready", target: ct.account });
        const prev = ct.previous_messages ?? [];
        setPrevMessages(prev);
        // Thread pendente → a conversa continua na vaga dela (campo fixado).
        const pending = prev.find((m) => m.status === "pending");
        if (pending) setJobTitle(pending.job_title ?? "");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ContactAuthError) navigate("/companies/new", { replace: true });
        else if (e instanceof ContactUnavailableError) setPhase({ kind: "unavailable" });
        else setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [account_id, navigate]);

  const openPositions = positions.filter((p) => !p.archived);
  const pendingThread = prevMessages.find((m) => m.status === "pending") ?? null;
  const pinned = pendingThread != null;
  const bodyLen = body.trim().length;
  const positionOk = pinned || jobTitle.trim().length > 0 || openPositions.length === 0;
  const canSend = bodyLen >= MIN_BODY && positionOk && phase.kind === "ready";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase.kind !== "ready" || !canSend) return;
    const target = phase.target;
    setError(null);
    setPhase({ kind: "sending", target });
    try {
      const result = await sendContact(account_id!, {
        job_title: jobTitle.trim(),
        body: body.trim(),
      });
      if (result.ok) {
        // Handoff: redirect pra aba Mensagens do dashboard.
        navigate("/company/dashboard#mensagens");
        return;
      }
      setError(result.message);
      setPhase({ kind: "ready", target });
    } catch (err) {
      if (err instanceof ContactAuthError) navigate("/companies/new", { replace: true });
      else if (err instanceof ContactUnavailableError) setPhase({ kind: "unavailable" });
      else {
        setError((err as Error).message);
        setPhase({ kind: "ready", target });
      }
    }
  }

  const shell = (children: React.ReactNode) => (
    <CompanyShell page="contact" activeTab="messages" companyName={company} crumbExtra="contato">
      <div style={{ maxWidth: 880 }}>
        <div className="compose">
          <a className="back-link" href="/company/dashboard#mensagens"
             onClick={(e) => { e.preventDefault(); navigate("/company/dashboard#mensagens"); }}>
            <span className="arrow" aria-hidden="true">←</span> {t("contact.shell.back")}
          </a>
          {children}
        </div>
      </div>
    </CompanyShell>
  );

  if (phase.kind === "loading") {
    return shell(<p className="app__loading">{t("contact.loading")}</p>);
  }

  if (phase.kind === "unavailable") {
    return shell(
      <>
        <PageHeader eyebrow={["empresa", "contato"]}
                    title={t("contact.unavailable.title")}
                    subtitle={t("contact.unavailable.body")} />
        <div>
          <Link className="back-link" to="/directory">
            <span className="arrow" aria-hidden="true">←</span> {t("contact.unavailable.back")}
          </Link>
        </div>
      </>,
    );
  }

  const target = phase.target;
  const sending = phase.kind === "sending";
  const handle = `@${target.handle.replace(/^@/, "")}`;

  return shell(
    <>
      <header className="page-h" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
        <div>
          <p className="page-h__eb"><span>empresa</span> <span className="sl">/</span> <span className="who">contato</span></p>
          <h1>{t("contact.title")}</h1>
          <p className="page-h__sub">
            {t("contact.shell.sub_prefix")}
            <b style={{ color: "var(--ink)", fontWeight: 600 }}>{t("contact.action_respond")}</b>
            {t("contact.shell.sub_suffix")}
          </p>
        </div>
      </header>

      <div>
        <p className="mono" style={{
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--ink-4)", margin: "0 0 10px",
        }}>
          {t("contact.profile.eyebrow")}
        </p>
        <DevProfileCompact dev={{
          handle: target.handle,
          bundle_slug: target.bundle_slug,
          badge: target.status ?? null,
          badgeTone: target.status === "outdated" ? "warn" : "ok",
          test_ratio: target.test_ratio,
          last_bundle_at: target.last_bundle_at,
          ecosystems: target.ecosystems,
        }} />
      </div>

      <Callout role="status">
        {t("contact.shell.callout_prefix")}<b>{handle}</b>{t("contact.shell.callout_mid")}
        <b>{t("contact.action_respond")}</b>{t("contact.shell.callout_suffix")}
        <span className="dimline">{t("contact.shell.callout_dim")}</span>
      </Callout>

      {prevMessages.length > 0 && <History items={prevMessages} companyName={company} />}

      <ComposeForm
        handle={handle}
        pinned={pinned}
        pinnedTitle={pendingThread?.job_title ?? null}
        openPositions={openPositions}
        jobTitle={jobTitle}
        onJobTitle={setJobTitle}
        body={body}
        onBody={setBody}
        devTestRatio={target.test_ratio ?? null}
        sending={sending}
        canSend={canSend && !sending}
        error={error}
        isFirstMessage={prevMessages.length === 0}
        onSubmit={handleSubmit}
      />
    </>,
  );
}

// ── history: threads agrupadas por vaga ─────────────────────────────────────

interface ThreadGroup {
  title: string | null;
  msgs: ContactPreviousMessage[];
  latest: ContactPreviousMessage;
  status: "pending" | "responded" | "ignored";
  statusAt: string;
}

function groupByPosition(items: ContactPreviousMessage[]): ThreadGroup[] {
  const order: (string | null)[] = [];
  const map = new Map<string | null, ContactPreviousMessage[]>();
  for (const m of items) {
    const key = m.job_title && m.job_title.trim() ? m.job_title : null;
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(m);
  }
  return order.map((title) => {
    const msgs = map.get(title)!;
    const latest = msgs[msgs.length - 1];
    const pending = msgs.find((m) => m.status === "pending");
    const responded = [...msgs].reverse().find((m) => m.status === "responded");
    const status = pending ? "pending" as const : responded ? "responded" as const : "ignored" as const;
    const statusAt = pending?.sent_at ?? responded?.responded_at ?? latest.sent_at;
    return { title, msgs, latest, status, statusAt };
  });
}

function History({ items, companyName }: { items: ContactPreviousMessage[]; companyName: string | null }) {
  const t = useT();
  const fmt = useFmt();
  const groups = groupByPosition(items);
  const initial = (companyName ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <section>
      <div className="history__h">
        <h2>{t("contact.prev.heading")} <span className="n">{items.length}</span></h2>
        <span className="meta">{t("contact.shell.history_meta")}</span>
      </div>
      <div className="history__stack">
        {groups.map((g) => (
          <ThreadCard key={g.title ?? "__none__"} group={g} initial={initial} fmt={fmt} />
        ))}
      </div>
    </section>
  );
}

function ThreadCard({ group: g, initial, fmt }: { group: ThreadGroup; initial: string; fmt: Formatters }) {
  const t = useT();
  const date = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : fmt.date(d, { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  return (
    <div className="thread">
      <div className="thread__h">
        <span className="pos">
          <span className="lab">{t("contact.shell.thread_label")}</span>
          {g.title ?? t("contact.form.no_position")}
          <span className="ct">{g.msgs.length}</span>
        </span>
        <span className="status">
          {g.status === "pending" && (
            <>
              <span className="dot" aria-hidden="true" />
              {t("contact.prev.sent", { date: date(g.statusAt) })}{" · "}
              <span className="wait">{t("contact.prev.status_pending")}</span>
            </>
          )}
          {g.status === "responded" && (
            <>
              <span className="dot dot--ok" aria-hidden="true" />
              <span className="ok">{t("contact.shell.thread_responded", { date: date(g.statusAt) })}</span>
            </>
          )}
          {g.status === "ignored" && <>{t("contact.shell.thread_declined")}</>}
        </span>
      </div>
      <div className="thread__msg">
        <span className="av" aria-hidden="true">{initial}</span>
        <p className="body">
          {g.latest.body.length > 240 ? g.latest.body.slice(0, 240) + "…" : g.latest.body}
          {g.latest.reply_body && (
            <span className="reply">
              <span className="lab">{t("contact.prev.reply_heading")}</span>
              {g.latest.reply_body}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── compose form ────────────────────────────────────────────────────────────

function ComposeForm({ handle, pinned, pinnedTitle, openPositions, jobTitle, onJobTitle, body, onBody, devTestRatio, sending, canSend, error, isFirstMessage, onSubmit }: {
  handle: string;
  pinned: boolean;
  pinnedTitle: string | null;
  openPositions: Position[];
  jobTitle: string;
  onJobTitle: (v: string) => void;
  body: string;
  onBody: (v: string) => void;
  devTestRatio: number | null;
  sending: boolean;
  canSend: boolean;
  error: string | null;
  isFirstMessage: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const t = useT();
  const len = body.length;
  const short = body.trim().length > 0 && body.trim().length < MIN_BODY;

  const selected = useMemo(
    () => openPositions.find((p) => p.title === jobTitle) ?? null,
    [openPositions, jobTitle],
  );

  function useTemplate() {
    const pos = pinned ? pinnedTitle : jobTitle;
    onBody(t("contact.shell.template", { handle, position: pos || t("contact.form.no_position") }));
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <div className="form-card__h">
        <h2>{t("contact.shell.form_title")}</h2>
        <span className={`meta${error ? " warn" : ""}`}>
          {error
            ? t("contact.shell.status_error")
            : sending
              ? t("contact.form.submitting")
              : t("contact.shell.status_draft")}
        </span>
      </div>

      <div className="form-card__b">
        {error && <Callout variant="warn">{error}</Callout>}

        {/* cargo da vaga */}
        <div className="field">
          <span className="field__label" id="position-label">
            {t("contact.form.job_title_label")}
            <span className="hint">
              {pinned ? t("contact.shell.pos_hint_pinned") : t("contact.shell.pos_hint_open")}
            </span>
          </span>

          {pinned ? (
            <>
              <div className="pinned-pos" aria-disabled="true" aria-labelledby="position-label"
                   title={t("contact.shell.pin_tooltip")}>
                <span className="l">
                  <span className="lock" aria-hidden="true">⏏</span>
                  {pinnedTitle ?? t("contact.form.no_position")}
                </span>
                <span className="r">
                  <span className="dot" aria-hidden="true" />
                  {t("contact.shell.pinned")}
                </span>
              </div>
              <input type="hidden" name="job_title" value={pinnedTitle ?? ""} />
            </>
          ) : openPositions.length > 0 ? (
            <>
              <select value={jobTitle} aria-labelledby="position-label"
                      disabled={sending}
                      onChange={(e) => onJobTitle(e.target.value)}>
                <option value="">{t("contact.form.select_position")}</option>
                {openPositions.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
              </select>
              {selected && <CriteriaHint position={selected} devTestRatio={devTestRatio} />}
            </>
          ) : (
            <>
              <input type="text" value={jobTitle} disabled={sending}
                     aria-labelledby="position-label"
                     onChange={(e) => onJobTitle(e.target.value)}
                     style={{
                       fontFamily: "var(--mono)", fontSize: 13.5, padding: "10px 12px",
                       color: "var(--ink)", background: "var(--bg)",
                       border: "1px solid var(--line-2)", borderRadius: 0, outline: "none",
                     }} />
              <span className="crit-hint">
                {t("contact.shell.no_positions")}{" "}
                <Link to="/company/dashboard#posicoes" style={{ color: "var(--signal-ink)" }}>
                  {t("company.shell.cta.new_position")}
                </Link>
              </span>
            </>
          )}
        </div>

        {/* mensagem */}
        <div className="field">
          <label className="field__label" htmlFor="msg">
            {t("contact.form.message_label")}
            <span className="hint">{t("contact.form.message_hint")}</span>
          </label>
          <textarea id="msg" className="textarea" value={body}
                    maxLength={MAX_BODY} required disabled={sending}
                    placeholder={t("contact.shell.msg_placeholder", { handle })}
                    onChange={(e) => onBody(e.target.value)} />
          <div className="field__below">
            <span className={`count${short ? " warn" : ""}`} aria-live="polite" aria-atomic="true">
              <b>{len}</b> / {MAX_BODY} {t("contact.shell.chars")}
              {short && <> · {t("contact.shell.min_chars", { min: MIN_BODY })}</>}
            </span>
            <span className="tips">
              {isFirstMessage && <span>{t("contact.shell.first_message")}</span>}
              <button type="button" disabled={body.length > 0 || sending} onClick={useTemplate}>
                {t("contact.shell.use_template")}
              </button>
            </span>
          </div>
        </div>
      </div>

      <div className="form-card__foot">
        <span className="keep">{t("contact.shell.keep_line")}</span>
        <span className="actions">
          <Link to="/company/dashboard#mensagens" className="btn">
            {t("contact.form.back")}
          </Link>
          <ShellButton primary type="submit" disabled={!canSend} icon={PlaneIcon}>
            {sending ? t("contact.form.submitting") : t("contact.form.submit")}
          </ShellButton>
        </span>
      </div>
    </form>
  );
}

// Sanity-check do match: critério principal da vaga + se o dev passa nele
// (só temos test_ratio do dev neste payload — outros sinais ficam sem o
// "este dev passa").
function CriteriaHint({ position, devTestRatio }: { position: Position; devTestRatio: number | null }) {
  const t = useT();
  const top = [...(position.priorities ?? [])].sort((a, b) => a.ranking - b.ranking)[0];
  if (!top) return null;
  const th = (position.thresholds ?? []).find((x) => x.signal === top.signal);
  if (!th) return null;

  const label = t(`company.positions.signal.${top.signal as PositionSignal}.label`);
  let desc = "";
  if ("items" in th.value) desc = `inclui ${th.value.items.join(", ")}`;
  else if (top.signal === "test_ratio") desc = `≥ ${th.value.number}%`;
  else desc = `≤ ${th.value.number}d`;

  const passes = top.signal === "test_ratio" && devTestRatio != null && "number" in th.value
    ? devTestRatio >= th.value.number
    : null;

  return (
    <span className="crit-hint">
      {t("contact.shell.crit_main")} {label} {desc}
      {passes != null && (
        passes
          ? <span className="ok"> · {t("contact.shell.crit_passes", { ratio: Math.round(devTestRatio!) })}</span>
          : <span className="warn"> · {t("contact.shell.crit_fails", { ratio: Math.round(devTestRatio!) })}</span>
      )}
    </span>
  );
}

const PlaneIcon = (
  <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
    <path d="M11 1L5.5 6.5M11 1L7.5 11l-2-4.5L1 4.5 11 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
