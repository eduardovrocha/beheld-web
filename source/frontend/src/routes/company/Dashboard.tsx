/**
 * /company/dashboard — recruiter dashboard, app-shell v2
 * (design_handoff_empresa). Renders OUTSIDE <Layout> — owns the full
 * shell (CompanyShell → AppShell). Dark-only; styles in
 * styles/app-shell.css + styles/app-company.css, scoped `.app-v2`.
 *
 * Views (sub-tabs, URL-hash synced): #mensagens · #devs · #posicoes.
 * The sidebar "atividade" quick-jumps set the same tab state.
 *
 * Wiring (handoff "Data Sources & Wiring", adaptado à API real):
 *   - useCompanyDashboard → /company/{dashboard,messages,saved_devs,positions}
 *   - matches por vaga → /company/positions/:id/matches (+ /recalculate)
 *   - nome da empresa + contagem do diretório → /directory (fetch silencioso;
 *     não existe /company/me — o payload do diretório é a fonte do nome)
 * CRUD de posições reusa NewForm/EditForm de PositionsList (exportados).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader, ShellButton } from "@/components/app/PageHeader";
import { Panel, PanelHeader } from "@/components/app/Panel";
import { SubTabs } from "@/components/app/SubTabs";
import { CompanyShell, COMPANY_TAB_HASH, type CompanyTab } from "@/components/company/CompanyShell";
import { NewForm, EditForm } from "@/components/company/PositionsList";
import { formatLocation } from "@/components/position/LocationPicker";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";
import { useT, useFmt } from "@/i18n/I18nProvider";
import type { Formatters } from "@/i18n/format";
import {
  getPositionMatches,
  recalculatePositionMatches,
  type CompanyMessage,
  type Position,
  type PositionInput,
  type PositionMatchesPayload,
  type PositionMatchRow,
  type PositionSignal,
  type PositionThreshold,
  type SavedDev,
} from "@/lib/companyDashboardApi";
import { getDirectory } from "@/lib/directoryApi";

// Scoped app-shell stylesheets (side-effect imports; selectors stay
// dormant outside this route's chunk).
import "@/styles/app-shell.css";
import "@/styles/app-company.css";

// ── helpers ─────────────────────────────────────────────────────────────────

function ddmm(fmt: Formatters, iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fmt.date(d, { day: "2-digit", month: "2-digit" });
}
function fullDate(fmt: Formatters, iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fmt.date(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function tabFromHash(hash: string): CompanyTab {
  const found = (Object.keys(COMPANY_TAB_HASH) as CompanyTab[])
    .find((id) => COMPANY_TAB_HASH[id] === hash);
  return found ?? "messages";
}

// ── route ───────────────────────────────────────────────────────────────────

export function CompanyDashboardPage() {
  const navigate = useNavigate();
  const t = useT();
  const {
    messages, savedDevs, positions,
    loading, error, authRequired,
    updateNote, removeSavedDev,
    createPosition, updatePosition, archivePosition, reactivatePosition, purgePosition,
    reloadMessages,
  } = useCompanyDashboard();

  const [tab, setTab] = useState<CompanyTab>(() => tabFromHash(window.location.hash));
  // Pedido explícito de "Nova posição" vindo do header — consumido pelo
  // PositionsView quando a tab posições monta.
  const [wantNew, setWantNew] = useState(false);

  // Nome da empresa + contagem do diretório (fetch silencioso — chrome only).
  const [company, setCompany] = useState<string | null>(null);
  const [dirCount, setDirCount] = useState<number | null>(null);

  // Neutralise the global themed chrome while the shell is mounted.
  useEffect(() => {
    document.documentElement.classList.add("app-v2-page");
    return () => document.documentElement.classList.remove("app-v2-page");
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDirectory().then((payload) => {
      if (cancelled) return;
      setCompany(payload.company.name);
      setDirCount(payload.results.length);
    }).catch(() => { /* chrome-only — badge/foot ficam ocultos */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onHash() { setTab(tabFromHash(window.location.hash)); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function selectTab(id: CompanyTab) {
    setTab(id);
    history.replaceState(null, "", COMPANY_TAB_HASH[id]);
  }

  // Auto-refresh da aba Mensagens (respostas dos devs sem reload manual):
  // refetch ao entrar na aba, ao reganhar foco/visibilidade, e a cada 25s.
  const reloadRef = useRef(reloadMessages);
  reloadRef.current = reloadMessages;
  useEffect(() => {
    if (tab !== "messages") return;
    const refresh = () => { if (!document.hidden) reloadRef.current(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = window.setInterval(refresh, 25_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(id);
    };
  }, [tab]);

  useEffect(() => {
    if (authRequired) navigate("/sessions/company/new", { replace: true });
  }, [authRequired, navigate]);

  const activePositions = positions.filter((p) => !p.archived);

  return (
    <CompanyShell page="dashboard" activeTab={tab} companyName={company}
                  counts={{
                    messages:  messages.length,
                    devs:      savedDevs.length,
                    positions: activePositions.length,
                    ...(dirCount != null ? { directory: dirCount } : {}),
                  }}
                  onJump={selectTab}>
      <PageHeader
        eyebrow={["empresa", company ?? "—"]}
        title={t("company.shell.h1")}
        subtitle={t("company.shell.sub")}
        cta={
          <>
            <ShellButton icon={PlusGlyph} disabled title={t("company.shell.soon")}>
              {t("company.shell.cta.invite")}
            </ShellButton>
            <ShellButton icon={PlusGlyph} primary
                         onClick={() => { setWantNew(true); selectTab("positions"); }}>
              {t("company.shell.cta.new_position")}
            </ShellButton>
          </>
        }
      />

      {loading && !error && <p className="app__loading">{t("company.dashboard.loading")}</p>}
      {error && (
        <Panel header={<PanelHeader title={t("company.shell.error_title")} />}>
          <p style={{ color: "var(--ink-3)", fontSize: 13.5, margin: 0 }}>{error}</p>
        </Panel>
      )}

      {!loading && !error && (
        <>
          <SubTabs<CompanyTab> big
            tabs={[
              { id: "messages",  label: t("company.dashboard.tabs.messages.label"),  n: String(messages.length) },
              { id: "devs",      label: t("company.dashboard.tabs.devs.label"),      n: String(savedDevs.length) },
              { id: "positions", label: t("company.dashboard.tabs.positions.label"), n: String(activePositions.length) },
            ]}
            active={tab}
            onSelect={selectTab}
          />

          {tab === "messages" && <MessagesPanel messages={messages} />}

          {tab === "devs" && (
            <SavedPanel savedDevs={savedDevs} onUpdateNote={updateNote} onRemove={removeSavedDev} />
          )}

          {tab === "positions" && (
            <PositionsView positions={positions}
                           wantNew={wantNew}
                           onConsumeWantNew={() => setWantNew(false)}
                           onCreate={createPosition}
                           onUpdate={updatePosition}
                           onArchive={archivePosition}
                           onReactivate={reactivatePosition}
                           onPurge={purgePosition} />
          )}
        </>
      )}
    </CompanyShell>
  );
}

const PlusGlyph = (
  <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
    <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// ── View 1: Mensagens ───────────────────────────────────────────────────────

type MsgFilter = "all" | "responded" | "pending";

const MSG_ST: Record<CompanyMessage["status"], { cls: string; glyph: string }> = {
  responded: { cls: "ok",   glyph: "✓" },
  ignored:   { cls: "no",   glyph: "✕" },
  pending:   { cls: "wait", glyph: "◷" },
};

function MessagesPanel({ messages }: { messages: CompanyMessage[] }) {
  const t = useT();
  const fmt = useFmt();
  const [filter, setFilter] = useState<MsgFilter>("all");

  const responded = messages.filter((m) => m.status === "responded").length;
  const pending   = messages.filter((m) => m.status === "pending").length;
  const declined  = messages.filter((m) => m.status === "ignored").length;

  const visible = filter === "all" ? messages : messages.filter((m) => m.status === filter);

  return (
    <Panel flush={visible.length > 0}
           style={{ paddingTop: 0, paddingBottom: 0 }}
           header={<PanelHeader
             title={t("company.shell.messages.title")}
             meta={t("company.shell.messages.meta", { total: messages.length, responded, pending, declined })}
             right={
               <span className="filter-inline">
                 <span>{t("company.shell.messages.filter_label")}</span>
                 {(["all", "responded", "pending"] as const).map((f) => (
                   <button key={f} type="button" className={filter === f ? "on" : undefined}
                           onClick={() => setFilter(f)}>
                     {t(`company.shell.messages.filter.${f}`)}
                   </button>
                 ))}
               </span>
             } />}>
      {visible.length === 0 ? (
        <EmptyState icon="✉" title={t("company.shell.messages.empty_title")}
                    description={t("company.shell.messages.empty")} />
      ) : (
        <div className="list" style={{ border: 0 }}>
          {visible.map((m) => {
            const st = MSG_ST[m.status];
            return (
              <div key={m.id} className="row">
                <span className={`st ${st.cls}`} aria-hidden="true">{st.glyph}</span>
                <span className="handle">
                  {m.bundle_slug
                    ? <a href={`/v/${m.bundle_slug}`} target="_blank" rel="noreferrer">@{m.dev_handle.replace(/^@/, "")}</a>
                    : <>@{m.dev_handle.replace(/^@/, "")}</>}
                </span>
                <span className="body">
                  <b>{m.job_title ?? t("dashboard.messages.position_none")}</b>
                  <span className="preview">{m.body_excerpt}</span>
                </span>
                <span className="meta">
                  {t("company.shell.messages.sent", { date: ddmm(fmt, m.sent_at) })}
                  {m.status === "responded" && m.responded_at && (
                    <span className="ok"> · {t("company.shell.messages.replied", { date: ddmm(fmt, m.responded_at) })}</span>
                  )}
                  {m.status === "ignored" && (
                    <span> · {t("company.shell.messages.declined")}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ── View 2: Devs salvos ─────────────────────────────────────────────────────

function SavedPanel({ savedDevs, onUpdateNote, onRemove }: {
  savedDevs: SavedDev[];
  onUpdateNote: (accountId: number, note: string) => Promise<void> | void;
  onRemove:     (accountId: number)               => Promise<void> | void;
}) {
  const t = useT();
  return (
    <Panel flush={savedDevs.length > 0}
           style={{ paddingTop: 0, paddingBottom: 0 }}
           header={<PanelHeader title={t("company.dashboard.tabs.devs.label")}
                                meta={t("company.shell.saved.meta", { count: savedDevs.length })} />}>
      {savedDevs.length === 0 ? (
        <EmptyState icon="✓" title={t("company.shell.saved.empty_title")}
                    description={t("company.shell.saved.empty")} />
      ) : (
        <div className="list" style={{ border: 0 }}>
          {savedDevs.map((dev) => (
            <SavedRow key={dev.account_id} dev={dev} onUpdateNote={onUpdateNote} onRemove={onRemove} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function SavedRow({ dev, onUpdateNote, onRemove }: {
  dev: SavedDev;
  onUpdateNote: (accountId: number, note: string) => Promise<void> | void;
  onRemove:     (accountId: number)               => Promise<void> | void;
}) {
  const t = useT();
  const fmt = useFmt();
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(dev.note ?? "");
  const [busy,    setBusy]    = useState(false);

  async function save() {
    setBusy(true);
    try { await onUpdateNote(dev.account_id, draft); setEditing(false); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm(t("company.saved.remove_confirm"))) return;
    setBusy(true);
    try { await onRemove(dev.account_id); } finally { setBusy(false); }
  }

  return (
    <div className="row row--saved">
      <span className="st ok" aria-hidden="true">✓</span>
      <span className="handle">
        {dev.bundle_slug
          ? <a href={`/v/${dev.bundle_slug}`} target="_blank" rel="noreferrer">@{dev.dev_handle.replace(/^@/, "")}</a>
          : <>@{dev.dev_handle.replace(/^@/, "")}</>}
      </span>
      <span className="note">
        {editing ? (
          <>
            <input value={draft} autoFocus
                   placeholder={t("company.saved.note_placeholder")}
                   onChange={(e) => setDraft(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") void save();
                     if (e.key === "Escape") { setDraft(dev.note ?? ""); setEditing(false); }
                   }} />
            <button type="button" className="edit" disabled={busy} onClick={() => void save()}>
              {t("company.saved.save_note")}
            </button>
            <button type="button" className="edit" disabled={busy}
                    onClick={() => { setDraft(dev.note ?? ""); setEditing(false); }}>
              {t("common.cancel")}
            </button>
          </>
        ) : (
          <>
            {dev.note
              ? <span>{dev.note}</span>
              : <span className="placeholder">{t("company.shell.saved.no_note")}</span>}
            <button type="button" className="edit" onClick={() => setEditing(true)}>
              {dev.note ? t("company.shell.saved.edit") : t("company.shell.saved.edit_note")}
            </button>
          </>
        )}
      </span>
      <span className="actions">
        <span className="meta">{t("company.shell.saved.saved_at", { date: ddmm(fmt, dev.saved_at) })}</span>
        <Link to={`/accounts/${dev.account_id}/contact`}>{t("company.saved.send_message")}</Link>
        <span className="sep" aria-hidden="true">|</span>
        <button type="button" className="danger" disabled={busy} onClick={() => void remove()}>
          {t("company.saved.remove")}
        </button>
      </span>
    </div>
  );
}

// ── View 3: Posições ────────────────────────────────────────────────────────

type PosMode = { kind: "list" } | { kind: "new" } | { kind: "edit"; id: number };
type PosSeg = "active" | "archived";
type PosTab = "desc" | "match";

interface MatchState {
  loading: boolean;
  error:   string | null;
  data:    PositionMatchesPayload | null;
}

function PositionsView({ positions, wantNew, onConsumeWantNew, onCreate, onUpdate, onArchive, onReactivate, onPurge }: {
  positions: Position[];
  wantNew: boolean;
  onConsumeWantNew: () => void;
  onCreate:     (input: PositionInput) => Promise<void> | void;
  onUpdate:     (id: number, input: Partial<PositionInput>) => Promise<void> | void;
  onArchive:    (id: number) => Promise<void> | void;
  onReactivate: (id: number) => Promise<void> | void;
  onPurge:      (id: number) => Promise<void> | void;
}) {
  const t = useT();
  const [seg, setSeg] = useState<PosSeg>("active");
  const [mode, setMode] = useState<PosMode>({ kind: "list" });
  const [openId, setOpenId] = useState<number | null>(null);
  const [posTab, setPosTab] = useState<PosTab>("desc");
  const [matches, setMatches] = useState<Record<number, MatchState>>({});
  const [recalcBusy, setRecalcBusy] = useState(false);

  const inSeg = (s: PosSeg) => (p: Position) => (s === "active" ? !p.archived : p.archived);
  const visible = positions.filter(inSeg(seg));
  const activeCount = positions.filter((p) => !p.archived).length;
  const archivedCount = positions.length - activeCount;

  // Header "Nova posição" → open the create panel when this view mounts.
  useEffect(() => {
    if (wantNew) { setSeg("active"); setMode({ kind: "new" }); onConsumeWantNew(); }
  }, [wantNew, onConsumeWantNew]);

  // Keep the open card valid as the list reshapes; default to the first.
  useEffect(() => {
    if (openId != null && visible.some((p) => p.id === openId)) return;
    setOpenId(visible[0]?.id ?? null);
    setPosTab("desc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, seg]);

  const open = visible.find((p) => p.id === openId) ?? null;

  // Prefetch matches when a position opens (the tab chip shows the count).
  useEffect(() => {
    if (!open || matches[open.id]) return;
    const id = open.id;
    setMatches((m) => ({ ...m, [id]: { loading: true, error: null, data: null } }));
    getPositionMatches(id)
      .then((data) => setMatches((m) => ({ ...m, [id]: { loading: false, error: null, data } })))
      .catch((e) => setMatches((m) => ({ ...m, [id]: { loading: false, error: (e as Error).message, data: null } })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  async function recalc(id: number) {
    setRecalcBusy(true);
    try {
      const data = await recalculatePositionMatches(id);
      setMatches((m) => ({ ...m, [id]: { loading: false, error: null, data } }));
    } catch (e) {
      setMatches((m) => ({ ...m, [id]: { loading: false, error: (e as Error).message, data: null } }));
    } finally {
      setRecalcBusy(false);
    }
  }

  if (mode.kind === "new") {
    return (
      <div className="pos-detail" style={{ borderTop: "1px solid var(--line)" }}>
        <NewForm onCreate={async (input) => { await onCreate(input); setMode({ kind: "list" }); }}
                 onCancel={() => setMode({ kind: "list" })} />
      </div>
    );
  }
  if (mode.kind === "edit") {
    const editing = positions.find((p) => p.id === mode.id);
    if (editing) {
      return (
        <div className="pos-detail" style={{ borderTop: "1px solid var(--line)" }}>
          <EditForm position={editing}
                    onSave={async (input) => { await onUpdate(editing.id, input); setMode({ kind: "list" }); }}
                    onCancel={() => setMode({ kind: "list" })} />
        </div>
      );
    }
  }

  return (
    <section style={{ paddingTop: 0, paddingBottom: 0 }}>
      {/* toolbar */}
      <div className="pos-toolbar">
        <div className="grp">
          <span className="lab">{t("company.shell.pos.label")}</span>
          <div className="seg" role="tablist">
            <button type="button" role="tab" aria-selected={seg === "active"}
                    className={seg === "active" ? "active" : undefined}
                    onClick={() => setSeg("active")}>
              {t("company.positions.tab.active")} <span className="n">{activeCount}</span>
            </button>
            <button type="button" role="tab" aria-selected={seg === "archived"}
                    className={seg === "archived" ? "active" : undefined}
                    onClick={() => setSeg("archived")}>
              {t("company.positions.tab.archived")} <span className="n">{archivedCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* list + detail */}
      {visible.length === 0 ? (
        <div style={{ border: "1px solid var(--line)", borderTop: 0, padding: 22, background: "var(--surface)" }}>
          <EmptyState icon="+" title={t("company.shell.pos.empty_title")}
                      description={seg === "active" ? t("company.shell.pos.empty_active") : t("company.positions.empty.archived")} />
        </div>
      ) : (
        <div className="pos-list">
          {visible.map((p) => (
            <PositionBlock key={p.id} position={p}
                           open={p.id === openId}
                           onToggle={() => { setOpenId(p.id === openId ? null : p.id); setPosTab("desc"); }}
                           posTab={posTab} onPosTab={setPosTab}
                           match={matches[p.id] ?? null}
                           recalcBusy={recalcBusy}
                           onRecalc={() => void recalc(p.id)}
                           onEdit={() => setMode({ kind: "edit", id: p.id })}
                           onArchive={() => {
                             if (!confirm(t("company.positions.archive_confirm"))) return;
                             void onArchive(p.id);
                           }}
                           onReactivate={() => void onReactivate(p.id)}
                           onPurge={() => {
                             if (!confirm(t("company.positions.purge_confirm"))) return;
                             void onPurge(p.id);
                           }} />
          ))}
        </div>
      )}
    </section>
  );
}

function PositionBlock({ position: p, open, onToggle, posTab, onPosTab, match, recalcBusy, onRecalc, onEdit, onArchive, onReactivate, onPurge }: {
  position: Position;
  open: boolean;
  onToggle: () => void;
  posTab: PosTab;
  onPosTab: (t: PosTab) => void;
  match: MatchState | null;
  recalcBusy: boolean;
  onRecalc: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onPurge: () => void;
}) {
  const t = useT();
  const fmt = useFmt();
  const where = Object.keys(p.location ?? {}).length > 0 ? formatLocation(p.location) : null;
  const matchCount = match?.data?.matches.length ?? null;

  return (
    <div>
      <button type="button" className={`pos-card${open ? " is-open" : ""}`} onClick={onToggle}
              aria-expanded={open}>
        <span>
          <h3>{p.title}</h3>
          <span className="where">
            {where && <>{where} · </>}
            {p.archived
              ? t("company.positions.badge.archived").toLowerCase()
              : p.status === "active"
                ? <span className="ok">{t("company.shell.pos.active")}</span>
                : <span className="warn">{t(`company.shell.pos.status.${p.status}`)}</span>}
            {p.expires_at && !p.archived && (
              <span className="warn"> · {t("company.shell.pos.expires", { date: fullDate(fmt, p.expires_at) })}</span>
            )}
          </span>
        </span>
        <span className="arrow" aria-hidden="true">▸</span>
      </button>

      {open && (
        <div className="pos-detail">
          <div className="pos-detail__top">
            <div>
              <h2>{p.title}</h2>
              {where && <div className="where">{where}</div>}
              <div className="pills">
                {p.archived
                  ? <span className="pill">{t("company.positions.badge.archived")}</span>
                  : p.status === "active"
                    ? <span className="pill pill--ok">{t("company.shell.pos.active")}</span>
                    : <span className="pill pill--warn">{t(`company.shell.pos.status.${p.status}`)}</span>}
                <span className="pill">{t("company.shell.pos.created", { date: fullDate(fmt, p.created_at) })}</span>
                {p.expires_at && (
                  <span className="pill pill--warn">{t("company.shell.pos.expires", { date: fullDate(fmt, p.expires_at) })}</span>
                )}
              </div>
            </div>
            <div className="pos-detail__actions">
              {p.archived ? (
                <>
                  <ShellButton onClick={onReactivate}>{t("company.shell.pos.reactivate")}</ShellButton>
                  <ShellButton onClick={onPurge}>{t("company.shell.pos.purge")}</ShellButton>
                </>
              ) : (
                <>
                  <ShellButton onClick={onEdit}>{t("company.shell.pos.edit")}</ShellButton>
                  <ShellButton onClick={onArchive}>{t("company.shell.pos.archive")}</ShellButton>
                </>
              )}
            </div>
          </div>

          <div className="pos-detail__tabs" role="tablist">
            <button type="button" role="tab" aria-selected={posTab === "desc"}
                    className={posTab === "desc" ? "active" : undefined}
                    onClick={() => onPosTab("desc")}>
              {t("company.shell.pos.tab.desc")}
            </button>
            <button type="button" role="tab" aria-selected={posTab === "match"}
                    className={posTab === "match" ? "active" : undefined}
                    onClick={() => onPosTab("match")}>
              {t("company.positions.matches.heading")}
              {matchCount != null && <span className="n">{matchCount}</span>}
            </button>
          </div>

          {posTab === "desc" && <PositionDescription position={p} />}
          {posTab === "match" && (
            <PositionMatches position={p} match={match} recalcBusy={recalcBusy} onRecalc={onRecalc} />
          )}
        </div>
      )}
    </div>
  );
}

// ── detail: Descrição ───────────────────────────────────────────────────────

const SECTION_ORDER = ["responsibilities", "requirements", "qualifications", "nice_to_have"] as const;

function PositionDescription({ position: p }: { position: Position }) {
  const t = useT();
  const blocks = SECTION_ORDER
    .map((key) => ({ key, text: p.sections?.[key] }))
    .filter((b): b is { key: typeof SECTION_ORDER[number]; text: string } => Boolean(b.text));

  const criteria = useMemo(() => buildCriteria(p), [p]);

  return (
    <div className="pos-blocks">
      <div>
        {blocks.length === 0 && p.description && (
          <>
            <h4>{t("company.shell.pos.sec.description")}</h4>
            <p>{p.description}</p>
          </>
        )}
        {blocks.length === 0 && !p.description && (
          <p style={{ color: "var(--ink-4)" }}>{t("company.shell.pos.no_description")}</p>
        )}
        {blocks.map(({ key, text }) => (
          <div key={key}>
            <h4>{t(`company.shell.pos.sec.${key}`)}</h4>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div>
        {p.technologies.length > 0 && (
          <>
            <h4>{t("company.shell.pos.tech")}</h4>
            <div className="tech-row">
              {p.technologies.map((tech) => <span key={tech} className="tech">{tech}</span>)}
            </div>
          </>
        )}

        {criteria.length > 0 && (
          <>
            <h4>{t("company.shell.pos.criteria")}</h4>
            <div className="criteria">
              {criteria.map((c) => (
                <div key={c.signal} className="criteria__r">
                  <span className="n"><b>{t(`company.positions.signal.${c.signal}.label`)}</b>{c.desc}</span>
                  <span className="pri">
                    {t("company.shell.pos.rank", { rank: c.ranking })}
                    <span className="w">{c.weight}%</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface CriteriaRow {
  signal: PositionSignal;
  desc: string;
  ranking: number;
  weight: number;
}

function thresholdFor(thresholds: PositionThreshold[], signal: PositionSignal): PositionThreshold | undefined {
  return thresholds.find((th) => th.signal === signal);
}

function buildCriteria(p: Position): CriteriaRow[] {
  return [...(p.priorities ?? [])]
    .sort((a, b) => a.ranking - b.ranking)
    .map((pri) => {
      const th = thresholdFor(p.thresholds ?? [], pri.signal);
      let desc = "";
      if (th) {
        if ("items" in th.value) desc = ` inclui ${th.value.items.join(", ")}`;
        else if (pri.signal === "test_ratio") desc = ` ≥ ${th.value.number}%`;
        else desc = ` ≤ ${th.value.number}d`;
      }
      const w = pri.weight <= 1 ? Math.round(pri.weight * 100) : Math.round(pri.weight);
      return { signal: pri.signal, desc, ranking: pri.ranking, weight: w };
    });
}

// ── detail: devs que correspondem ───────────────────────────────────────────

function PositionMatches({ position, match, recalcBusy, onRecalc }: {
  position: Position;
  match: MatchState | null;
  recalcBusy: boolean;
  onRecalc: () => void;
}) {
  const t = useT();
  const fmt = useFmt();
  const [segment, setSegment] = useState<"match" | "near_miss">("match");

  if (!match || match.loading) {
    return <p className="app__loading" style={{ padding: "16px 0" }}>{t("company.positions.matches.loading")}</p>;
  }
  if (match.error) {
    return (
      <p style={{ color: "var(--amber)", fontFamily: "var(--mono)", fontSize: 12.5, padding: "16px 0" }}>
        {match.error}
      </p>
    );
  }
  const data = match.data!;
  const rows = segment === "match" ? data.matches : data.near_miss;

  return (
    <>
      <div className="match-h">
        <div className="stats-inline">
          <button type="button" className={`ok${segment === "match" ? " on" : ""}`}
                  onClick={() => setSegment("match")}>
            <b>{data.matches.length}</b> {t("company.shell.match.confirmed")}
          </button>
          <button type="button" className={segment === "near_miss" ? "on" : undefined}
                  onClick={() => setSegment("near_miss")}>
            <b>{data.near_miss.length}</b> near-miss
          </button>
        </div>
        <div className="right">
          {data.calculated_at && (
            <span className="meta">
              {t("company.positions.matches.calculated", {
                datetime: `${ddmm(fmt, data.calculated_at)} ${fmt.time(new Date(data.calculated_at), { hour: "2-digit", minute: "2-digit" })}`,
              })}
            </span>
          )}
          <ShellButton disabled={recalcBusy} onClick={onRecalc}>
            {recalcBusy ? t("company.positions.matches.recalc_busy") : t("company.positions.matches.recalc")}
          </ShellButton>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="○"
                    title={segment === "match" ? t("company.positions.matches.empty.match") : t("company.positions.matches.empty.near_miss")}
                    description={t("company.shell.match.empty_hint")} />
      ) : (
        <div className="matches">
          {rows.map((row) => (
            <MatchRowV2 key={row.account_id} row={row}
                        positionTitle={position.title}
                        thresholds={position.thresholds ?? []} />
          ))}
        </div>
      )}
    </>
  );
}

function MatchRowV2({ row, positionTitle, thresholds }: {
  row: PositionMatchRow;
  positionTitle: string;
  thresholds: PositionThreshold[];
}) {
  const t = useT();
  return (
    <div className="mrow">
      <span className="pct">{row.score}%</span>
      <span className="handle">@{row.dev_handle.replace(/^@/, "")}</span>
      <span className="why">
        <WhyLine row={row} thresholds={thresholds} />
        <br />
        <CurveLine row={row} />
      </span>
      <span className="actions">
        {row.bundle_slug && (
          <a href={`/v/${row.bundle_slug}`} target="_blank" rel="noreferrer">
            {t("company.positions.matches.view_profile")}
          </a>
        )}
        {/* pré-preenche o cargo na tela de contato (design_handoff_contato) */}
        <Link to={`/accounts/${row.account_id}/contact?position=${encodeURIComponent(positionTitle)}`} className="go">
          {t("company.positions.matches.contact")}
        </Link>
      </span>
    </div>
  );
}

function WhyLine({ row, thresholds }: { row: PositionMatchRow; thresholds: PositionThreshold[] }) {
  const t = useT();

  if (row.match_type === "near_miss" && row.failed_signal) {
    const d = row.failed_detail;
    let detail = "";
    if (row.failed_signal === "ecosystems" && d?.missing_items?.length) {
      detail = t("company.positions.near_miss.ecosystems", { items: d.missing_items.join(", ") });
    } else if (d?.current != null && d?.threshold != null) {
      detail = row.failed_signal === "recency"
        ? t("company.positions.near_miss.recency", { current: Math.round(d.current), threshold: d.threshold })
        : t("company.positions.near_miss.test_ratio", { current: Number(d.current.toFixed(1)), threshold: d.threshold });
    }
    return (
      <>
        <span className="lab">{t("company.positions.near_miss.failed")}</span>{" "}
        <span className="down">{t(`company.positions.signal.${row.failed_signal}.label`)}</span>
        {detail && <span className="lab"> {detail}</span>}
      </>
    );
  }

  const tr = thresholdFor(thresholds, "test_ratio");
  const trThreshold = tr && "number" in tr.value ? tr.value.number : null;
  const trCurrent = row.curve?.current ?? null;
  return (
    <>
      <span className="lab">{t("company.positions.match.passed")}</span>{" "}
      {trThreshold != null && trCurrent != null ? (
        <>
          <span className="ok">{t("company.positions.signal.test_ratio.label")}</span>
          <span className="lab"> {t("company.positions.near_miss.test_ratio", { current: Number(trCurrent.toFixed(1)), threshold: trThreshold })}</span>
        </>
      ) : (
        <span className="ok">{t("company.positions.match.all_signals")}</span>
      )}
    </>
  );
}

function CurveLine({ row }: { row: PositionMatchRow }) {
  const t = useT();
  const c = row.curve;
  if (!c || c.status === "none" || c.status === "not_applicable") {
    return <><span className="lab">{t("company.shell.curve.label")}</span> <span className="neu">—</span></>;
  }
  if (c.status === "building") {
    return (
      <>
        <span className="lab">{t("company.shell.curve.label")}</span>{" "}
        <span className="neu">{t("company.shell.curve.building")}</span>
        <span className="lab"> ({c.points ?? 1} {t("company.shell.curve.point")})</span>
      </>
    );
  }
  const up = c.trend === "up";
  const stable = c.trend === "stable";
  const delta = Math.abs(c.delta ?? 0).toFixed(1);
  return (
    <>
      <span className="lab">{t("company.shell.curve.label")}</span>{" "}
      <span className={stable ? "neu" : up ? "up" : "down"}>
        {stable ? "→" : up ? "↑" : "↓"} {stable ? "" : up ? `+${delta}%` : `−${delta}%`}
      </span>
      <span className="lab"> {t("company.shell.curve.period", { days: c.period_days ?? 0, points: c.points ?? 0 })}</span>
    </>
  );
}
