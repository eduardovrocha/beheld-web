/**
 * Master/detail layout for the recruiter's job positions.
 *
 *   [ list of positions ] [ details / new form / empty state ]
 *
 * Left column (master): a stack of compact rows, one per position, with
 * a "+ nova posição" button on top. Clicking a row selects it.
 *
 * Right column (detail): one of three modes —
 *   "empty"  → placeholder asking the recruiter to pick or create
 *   "new"    → inline form to register a new position
 *   "view"   → full description + meta + edit/archive actions
 *   "edit"   → editable form for the selected position
 *
 * Soft-archive (vs hard delete) so historical Message rows that referenced
 * the position can still resolve.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type {
  Position, PositionSections, PositionSectionKey, PositionInput, PositionLocation,
  PositionSignal, PositionThreshold, PositionMatchesPayload, PositionMatchRow,
} from "@/lib/companyDashboardApi";
import { getPositionMatches, recalculatePositionMatches } from "@/lib/companyDashboardApi";
import { SECTION_KEYS, type Sections } from "@/lib/positionMarkdownParser";
import { extractTechnologies } from "@/lib/positionTechExtractor";
import { LocationPicker, formatLocation } from "@/components/position/LocationPicker";
import { TabStrip } from "@/components/TabStrip";
import { Tooltip } from "@/components/Tooltip";
import { useT, useFmt } from "@/i18n/I18nProvider";

type Mode =
  | { kind: "empty" }
  | { kind: "new"  }
  | { kind: "view"; id: number }
  | { kind: "edit"; id: number };

type CreateInput = PositionInput;
type UpdateInput = Partial<PositionInput>;

type ListTab = "active" | "archived";

export function PositionsList({ positions, onCreate, onUpdate, onArchive, onReactivate, onPurge }: {
  positions:    Position[];
  onCreate:     (input: CreateInput) => Promise<void> | void;
  onUpdate:     (id: number, input: UpdateInput) => Promise<void> | void;
  onArchive:    (id: number) => Promise<void> | void;
  onReactivate: (id: number) => Promise<void> | void;
  onPurge:      (id: number) => Promise<void> | void;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>({ kind: "empty" });
  const [listTab, setListTab] = useState<ListTab>("active");

  const inTab = (tab: ListTab) => (p: Position) => (tab === "active" ? !p.archived : p.archived);
  const visible = positions.filter(inTab(listTab));
  const activeCount   = positions.filter((p) => !p.archived).length;
  const archivedCount = positions.length - activeCount;

  // Keep the right-column selection valid as the list reshapes (create,
  // archive, purge) and when the recruiter switches list tabs. Selection is
  // by id; we only auto-pick within the *currently visible* tab so the detail
  // never shows a row that isn't in the list you're looking at.
  useEffect(() => {
    const pick = positions.find(inTab(listTab));
    if (mode.kind === "view" || mode.kind === "edit") {
      if (!positions.some((p) => p.id === mode.id)) {
        setMode(pick ? { kind: "view", id: pick.id } : { kind: "empty" });
      }
    } else if (mode.kind === "empty" && pick) {
      setMode({ kind: "view", id: pick.id });
    }
  }, [positions, mode, listTab]);

  // Switching tabs: keep the current selection if it lives in the new tab,
  // otherwise jump to the first row there (or empty).
  function selectTab(tab: ListTab) {
    setListTab(tab);
    const sel = (mode.kind === "view" || mode.kind === "edit")
      ? positions.find((p) => p.id === mode.id) : null;
    if (sel && inTab(tab)(sel)) return;
    const first = positions.find(inTab(tab));
    setMode(first ? { kind: "view", id: first.id } : { kind: "empty" });
  }

  const selected = (mode.kind === "view" || mode.kind === "edit")
    ? positions.find((p) => p.id === mode.id) ?? null
    : null;

  return (
    <div className="grid gap-6"
         style={{ gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)" }}>
      {/* ── master ───────────────────────────────────────────────────────── */}
      <aside style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
        <div className="flex items-center justify-between"
             style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)" }}>
          <span className="font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
            {t("company.positions.master.title")}
          </span>
          <button type="button"
                  onClick={() => { setListTab("active"); setMode({ kind: "new" }); }}
                  style={primaryChip(mode.kind === "new")}>
            {t("company.positions.master.new")}
          </button>
        </div>

        {/* Ativa | Arquivada */}
        <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--rule-soft)" }}>
          {([["active", t("company.positions.tab.active"), activeCount], ["archived", t("company.positions.tab.archived"), archivedCount]] as const).map(
            ([id, label, count]) => {
              const on = listTab === id;
              return (
                <button key={id} type="button" role="tab" aria-selected={on}
                        onClick={() => selectTab(id)}
                        style={{
                          flex: 1, font: "inherit", fontSize: 11.5, letterSpacing: "0.04em",
                          padding: "8px 10px",
                          background: "transparent",
                          color: on ? "var(--text)" : "var(--muted)",
                          border: "none",
                          borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
                          marginBottom: -1, cursor: "pointer",
                        }}>
                  {label} <span className="font-mono" style={{ color: "var(--muted-soft)", fontSize: 10 }}>{count}</span>
                </button>
              );
            },
          )}
        </div>

        {visible.length === 0 ? (
          <p style={{ color: "var(--muted-soft)", fontSize: 12.5, lineHeight: 1.6, padding: "20px 16px" }}>
            {listTab === "active"
              ? <>{t("company.positions.empty.active_prefix")}<strong style={{ color: "var(--muted)" }}>{t("company.positions.master.new")}</strong>{t("company.positions.empty.active_suffix")}</>
              : t("company.positions.empty.archived")}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {visible.map((p) => {
              const active = (mode.kind === "view" || mode.kind === "edit") && mode.id === p.id;
              return (
                <li key={p.id}>
                  <button type="button"
                          onClick={() => setMode({ kind: "view", id: p.id })}
                          style={listRowStyle(active, p.archived)}>
                    <div style={{
                      color: active ? "var(--text)" : "var(--text)",
                      fontSize: 14, fontWeight: active ? 600 : 500, lineHeight: 1.35,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {p.title}
                    </div>
                    <div style={{
                      color: "var(--muted)", fontSize: 12, marginTop: 3, lineHeight: 1.4,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {Object.keys(p.location ?? {}).length > 0
                        ? formatLocation(p.location)
                        : <span style={{ color: "var(--muted-soft)" }}>{t("company.positions.no_location")}</span>}
                      {p.archived && (
                        <span className="font-mono uppercase"
                              style={{
                                marginLeft: "auto", padding: "1px 6px",
                                fontSize: 8, letterSpacing: "0.12em",
                                background: "var(--rule-soft)", color: "var(--muted)",
                                border: "1px solid var(--rule)",
                              }}>
                          {t("company.positions.badge.archived")}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── detail ───────────────────────────────────────────────────────── */}
      <section style={{ background: "var(--card-bg)", border: "1px solid var(--rule)", minHeight: 280 }}>
        {mode.kind === "empty" && (
          <EmptyPanel onNew={() => { setListTab("active"); setMode({ kind: "new" }); }} />
        )}

        {mode.kind === "new" && (
          <NewForm onCreate={async (input) => {
            await onCreate(input);
            // After create we leave the user on "empty" — the effect picks the
            // freshly inserted (active) row as soon as `positions` updates.
            setListTab("active");
            setMode({ kind: "empty" });
          }}
                   onCancel={() => setMode(positions[0] ? { kind: "view", id: positions[0].id } : { kind: "empty" })} />
        )}

        {(mode.kind === "view" || mode.kind === "edit") && selected && (
          mode.kind === "edit"
            ? <EditForm position={selected}
                        onSave={async (input) => { await onUpdate(selected.id, input); setMode({ kind: "view", id: selected.id }); }}
                        onCancel={() => setMode({ kind: "view", id: selected.id })} />
            : <DetailPanel position={selected}
                           onEdit={() => setMode({ kind: "edit", id: selected.id })}
                           onArchive={async () => {
                             if (!confirm(t("company.positions.archive_confirm"))) return;
                             await onArchive(selected.id);
                             // Move o foco pra aba Arquivada, onde a vaga agora
                             // vive e pode ser excluída em definitivo.
                             setListTab("archived");
                           }}
                           onReactivate={() => onReactivate(selected.id)}
                           onPurge={async () => {
                             if (!confirm(t("company.positions.purge_confirm"))) return;
                             await onPurge(selected.id);
                           }} />
        )}
      </section>
    </div>
  );
}

// ── detail panels ───────────────────────────────────────────────────────────

function EmptyPanel({ onNew }: { onNew: () => void }) {
  const t = useT();
  return (
    <div style={{ padding: 28 }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("company.positions.empty_panel.eyebrow")}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
        {t("company.positions.empty_panel.body")}
      </p>
      <div style={{ marginTop: 20 }}>
        <button type="button" onClick={onNew} style={primaryBtn(false)}>{t("company.positions.empty_panel.cta")}</button>
      </div>
    </div>
  );
}

type DetailSubTab = "description" | "matches";

function DetailPanel({ position, onEdit, onArchive, onReactivate, onPurge }: {
  position:     Position;
  onEdit:       () => void;
  onArchive:    () => void;
  onReactivate: () => void | Promise<void>;
  onPurge:      () => void | Promise<void>;
}) {
  const t = useT();
  const fmt = useFmt();
  const hasMatching = (position.thresholds ?? []).length > 0;
  // Reset to "description" when switching positions or when matching gets
  // disabled. key=position.id on the parent already remounts the strip; this
  // also guards the case where thresholds drop without a remount.
  const [tab, setTab] = useState<DetailSubTab>("description");
  useEffect(() => { if (!hasMatching && tab === "matches") setTab("description"); }, [hasMatching, tab]);

  return (
    <div style={{ padding: 28 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono uppercase"
             style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
          {t("company.positions.detail.eyebrow")}
          <PositionStatusChip status={position.status} />
        </div>
        <div className="flex items-center gap-3">
          <PositionExpiresLine status={position.status} expiresAt={position.expires_at} />
          {/* Ações da vaga arquivada — ícones, tooltip no hover */}
          {position.archived && (
            <ArchivedActions onReactivate={onReactivate} onPurge={onPurge} />
          )}
        </div>
      </div>

      <h3 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 22, letterSpacing: "-0.02em", marginTop: 8, lineHeight: 1.25 }}>
        {position.title}
      </h3>

      <div className="flex items-center justify-between gap-3"
           style={{ marginTop: 4 }}>
        <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
          {Object.keys(position.location ?? {}).length > 0 ? formatLocation(position.location) : null}
        </div>
        {/* Editar | Arquivar inline com a linha de localização — só pra
            vagas ativas (não arquivadas, não expiradas). */}
        {!position.archived && position.status !== "expired" && (
          <EditArchiveLinks onEdit={onEdit} onArchive={onArchive} />
        )}
      </div>

      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 8,
                     letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        {t("company.positions.detail.created", { date: fmt.date(position.created_at) })}
        {position.archived_at && <> · {t("company.positions.detail.archived_at", { date: fmt.date(position.archived_at) })}</>}
      </div>

      <div style={{ marginTop: 20 }}>
        <TabStrip<DetailSubTab>
          tabs={[
            { id: "description", label: t("company.positions.form.tab.description"), badge: null },
            ...(hasMatching
              ? [{ id: "matches" as const, label: t("company.positions.matches.heading"), badge: null }]
              : []),
          ]}
          active={tab}
          onSelect={setTab} />
      </div>

      <div className="pt-6">
        {tab === "description" && (
          <>
            {position.technologies && position.technologies.length > 0 && (
              <div>
                <div className="font-mono uppercase"
                     style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
                  {t("company.positions.detail.technologies")}
                </div>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {position.technologies.map((t) => <TechChip key={t} label={t} />)}
                </div>
              </div>
            )}

            <MatchCriteriaView position={position} />

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--rule-soft)" }}>
              <SectionsView sections={position.sections} fallback={position.description} />
            </div>
          </>
        )}

        {tab === "matches" && hasMatching && (
          <PositionMatchesPanel position={position} />
        )}
      </div>

      <PositionActions position={position} onEdit={onEdit} onArchive={onArchive}
                       onReactivate={onReactivate} />
    </div>
  );
}

// Compact icon actions for an archived vaga — pinned top-right of the detail
// panel. Each icon carries a rich Tooltip (icon · label · title · description)
// on hover/focus. Reativar restores the vaga; Excluir deletes it permanently.
function ArchivedActions({ onReactivate, onPurge }: {
  onReactivate: () => void | Promise<void>;
  onPurge:      () => void | Promise<void>;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => void | Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <Tooltip
        icon={<ReactivateIcon size={12} />}
        label={t("company.positions.reactivate.label")}
        title={t("company.positions.reactivate.title")}
        description={t("company.positions.reactivate.desc")}>
        <button type="button" disabled={busy} onClick={() => run(onReactivate)}
                aria-label={t("company.positions.reactivate.cta")} style={iconBtn(busy)}>
          <ReactivateIcon />
        </button>
      </Tooltip>
      <Tooltip
        tone="danger"
        icon={<TrashIcon size={12} />}
        label={t("company.positions.purge.label")}
        title={t("company.positions.purge.title")}
        description={t("company.positions.purge.desc")}>
        <button type="button" disabled={busy} onClick={() => run(onPurge)}
                aria-label={t("company.positions.purge.cta")} style={iconBtn(busy, "danger")}>
          <TrashIcon />
        </button>
      </Tooltip>
    </div>
  );
}

function iconBtn(busy: boolean, variant?: "danger"): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, padding: 0,
    background: "transparent",
    color: variant === "danger" ? "var(--warn)" : "var(--muted)",
    border: "1px solid var(--rule)",
    borderRadius: 0,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.5 : 1,
  };
}

function ReactivateIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function TrashIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

// Action row for non-archived vagas. Active → editar/arquivar; expired →
// Reativar + modify/encerrar (spec section 6). Archived vagas render their
// actions as icons up top (ArchivedActions), so nothing here.
function PositionActions({ position, onEdit, onArchive, onReactivate }: {
  position:     Position;
  onEdit:       () => void;
  onArchive:    () => void;
  onReactivate: () => void | Promise<void>;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function handleReactivate() {
    setBusy(true);
    try { await onReactivate(); } finally { setBusy(false); }
  }

  if (position.archived) return null;

  if (position.status === "expired") {
    return (
      <div style={{
        marginTop: 24, padding: 14,
        background: "rgba(181,97,53,0.08)",
        border: "1px solid rgba(181,97,53,0.35)",
      }}>
        <div className="font-mono uppercase"
             style={{ color: "var(--warn)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
          {t("company.positions.expired.eyebrow")}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>
          {t("company.positions.expired.body")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleReactivate} disabled={busy} style={primaryBtn(busy)}>
            {busy ? t("company.positions.reactivate.busy") : t("company.positions.reactivate.cta")}
          </button>
          <button type="button" onClick={onEdit}    disabled={busy} style={secondaryBtn(busy)}>{t("company.positions.expired.modify")}</button>
          <button type="button" onClick={onArchive} disabled={busy} style={dangerBtn(busy)}>{t("company.positions.expired.close")}</button>
        </div>
      </div>
    );
  }

  // Active state: Editar | Arquivar are rendered inline with the location
  // row by DetailPanel — nothing to draw in the footer.
  return null;
}

// Inline "Editar | Arquivar" link pair — same idiom as CompanyNav. Used
// in the location row of DetailPanel for active vagas.
function EditArchiveLinks({ onEdit, onArchive }: {
  onEdit: () => void; onArchive: () => void;
}) {
  const t = useT();
  return (
    <div className="font-mono"
         style={{ display: "flex", alignItems: "center", gap: 10,
                  fontSize: 12, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      <ActionLinkButton onClick={onEdit} icon={<EditIcon />}>
        {t("company.positions.actions.edit")}
      </ActionLinkButton>
      <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
      <ActionLinkButton onClick={onArchive} icon={<ArchiveIcon />} tone="warn">
        {t("company.positions.actions.archive")}
      </ActionLinkButton>
    </div>
  );
}

// Link-style action button: inline-flex icon + label, muted → accent/warn
// on hover. Same idiom as CompanyNav and the rest of the dashboard.
function ActionLinkButton({ onClick, icon, children, tone = "accent" }: {
  onClick: () => void; icon: ReactNode; children: ReactNode; tone?: "accent" | "warn";
}) {
  const hover = tone === "warn" ? "var(--warn)" : "var(--accent)";
  return (
    <button type="button" onClick={onClick}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "none", border: "none", padding: 0,
              font: "inherit", letterSpacing: "0.04em",
              color: "var(--muted)", cursor: "pointer",
              transition: "color 120ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = hover)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
      {icon} {children}
    </button>
  );
}

// Pencil — edit action.
function EditIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <path d="M1.5 9.5 L1.5 7.5 L7.5 1.5 L9.5 3.5 L3.5 9.5 Z" stroke="currentColor" strokeLinejoin="round" />
      <line x1="6.5" y1="2.5" x2="8.5" y2="4.5" stroke="currentColor" />
    </svg>
  );
}

// Open box — archive action.
function ArchiveIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <rect x="0.5" y="1.5" width="10" height="2.5" stroke="currentColor" />
      <path d="M1.5 4 L1.5 9.5 L9.5 9.5 L9.5 4" stroke="currentColor" />
      <line x1="4" y1="6" x2="7" y2="6" stroke="currentColor" />
    </svg>
  );
}

// ── forms ──────────────────────────────────────────────────────────────────

// PF.2 — the form is split into two independent tabs. State lives in the
// parent form component so switching tabs never loses data, and the
// Cancelar/Salvar row sits outside the tab panels so it's present on both.
type FormTab = "description" | "match_criteria";

function FormTabs({ active, onChange }: {
  active:   FormTab;
  onChange: (t: FormTab) => void;
}) {
  const t = useT();
  const tabs: Array<{ id: FormTab; label: string }> = [
    { id: "description",    label: t("company.positions.form.tab.description") },
    { id: "match_criteria", label: t("company.positions.form.tab.criteria") },
  ];
  return (
    <div role="tablist" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--rule)" }}>
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on}
                  onClick={() => onChange(t.id)}
                  style={{
                    font: "inherit", fontSize: 12,
                    letterSpacing: "0.04em",
                    padding: "8px 14px",
                    background: "transparent",
                    color: on ? "var(--text)" : "var(--muted)",
                    border: "none",
                    borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
                    marginBottom: -1,
                    cursor: "pointer",
                  }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function NewForm({ onCreate, onCancel }: {
  onCreate: (input: CreateInput) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [tab,          setTab]          = useState<FormTab>("description");
  const [title,        setTitle]        = useState("");
  const [location,     setLocation]     = useState<PositionLocation>({});
  const [sections,     setSections]     = useState<Sections>({});
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [criteria,     setCriteria]     = useState<MatchCriteria>(initialCriteria());
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const t = useT();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError(t("company.positions.form.title_required")); setTab("description"); return; }
    const criteriaError = validateCriteria(criteria, t);
    if (criteriaError) { setError(criteriaError); setTab("match_criteria"); return; }
    setBusy(true);
    setError(null);
    try {
      const { thresholds, priorities } = buildCriteriaPayload(criteria);
      await onCreate({
        title:        title.trim(),
        location:     Object.keys(location).length > 0 ? location : undefined,
        technologies: technologies.length > 0 ? technologies : undefined,
        sections:     sanitizeSections(sections),
        thresholds,
        priorities,
      });
    } catch (e2) {
      setError((e2 as Error).message || t("company.positions.form.create_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 28 }} className="grid gap-4">
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("company.positions.form.new_title")}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <FormTabs active={tab} onChange={setTab} />

      {tab === "description" && (
        <div className="grid gap-4">
          <Field label={t("company.positions.form.field.title")} hint={t("company.positions.form.field.title_hint")}>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                   required disabled={busy} placeholder={t("company.positions.form.field.title_placeholder")}
                   autoFocus style={inputStyle()} />
          </Field>

          <Field label={t("company.positions.form.field.location")} hint={t("company.positions.form.field.location_hint")}>
            <LocationPicker value={location} disabled={busy} onChange={setLocation} />
          </Field>

          <SectionFields disabled={busy} sections={sections} onChange={setSections} />

          <TechEditor label={t("company.positions.form.field.technologies")} disabled={busy}
                      techs={technologies} onChange={setTechnologies}
                      source={(sections.requirements ?? "") + "\n" + (sections.responsibilities ?? "")} />
        </div>
      )}

      {tab === "match_criteria" && (
        <MatchCriteriaEditor disabled={busy} value={criteria} onChange={setCriteria} />
      )}

      <div className="flex gap-2 justify-end" style={{ marginTop: 4 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={secondaryBtn(busy)}>{t("common.cancel")}</button>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>
          {busy ? t("company.positions.form.creating") : t("company.positions.form.create_cta")}
        </button>
      </div>
    </form>
  );
}

function EditForm({ position, onSave, onCancel }: {
  position: Position;
  onSave:   (input: UpdateInput) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [tab,          setTab]          = useState<FormTab>("description");
  const [title,        setTitle]        = useState(position.title);
  const [location,     setLocation]     = useState<PositionLocation>(position.location ?? {});
  const [sections,     setSections]     = useState<Sections>(position.sections ?? {});
  // Fusão Technical Stack → Tecnologias: positions antigas podem ter texto em
  // sections.technical_stack. Migramos os techs reconhecidos pras tags na hora
  // de editar (o campo technical_stack deixa de ser gravado em sanitizeSections).
  const [technologies, setTechnologies] = useState<string[]>(() => {
    const fromStack = extractTechnologies(position.sections?.technical_stack ?? "").technologies;
    return uniqueOrdered([...(position.technologies ?? []), ...fromStack]);
  });
  const [criteria,     setCriteria]     = useState<MatchCriteria>(criteriaFromPosition(position));
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const t = useT();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError(t("company.positions.form.title_required")); setTab("description"); return; }
    const criteriaError = validateCriteria(criteria, t);
    if (criteriaError) { setError(criteriaError); setTab("match_criteria"); return; }
    setBusy(true);
    setError(null);
    try {
      const { thresholds, priorities } = buildCriteriaPayload(criteria);
      await onSave({
        title:        title.trim(),
        location,
        technologies,
        sections:     sanitizeSections(sections),
        thresholds,
        priorities,
      });
    } catch (e2) {
      setError((e2 as Error).message || t("company.positions.form.save_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 28 }} className="grid gap-4">
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("company.positions.form.edit_title")}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <FormTabs active={tab} onChange={setTab} />

      {tab === "description" && (
        <div className="grid gap-4">
          <Field label={t("company.positions.form.field.title")}>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                   required disabled={busy} autoFocus style={inputStyle()} />
          </Field>
          <Field label={t("company.positions.form.field.location")}>
            <LocationPicker value={location} disabled={busy} onChange={setLocation} />
          </Field>

          <SectionFields disabled={busy} sections={sections} onChange={setSections} />

          <TechEditor label={t("company.positions.form.field.technologies")} disabled={busy}
                      techs={technologies} onChange={setTechnologies}
                      source={(sections.requirements ?? "") + "\n" + (sections.responsibilities ?? "")} />
        </div>
      )}

      {tab === "match_criteria" && (
        <MatchCriteriaEditor disabled={busy} value={criteria} onChange={setCriteria} />
      )}

      <div className="flex gap-2 justify-end" style={{ marginTop: 4 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={secondaryBtn(busy)}>{t("common.cancel")}</button>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>
          {busy ? t("company.positions.form.saving") : t("company.positions.form.save_cta")}
        </button>
      </div>
    </form>
  );
}

// ── primitives ──────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
        {label}
        {hint && <span style={{ color: "var(--muted-soft)", marginLeft: 6, letterSpacing: 0, textTransform: "none" }}>· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "8px 12px",
      background: "rgba(181,97,53,0.08)", border: "1px solid rgba(181,97,53,0.35)",
      color: "var(--warn)", fontSize: 13,
    }}>{children}</div>
  );
}

// ── styles ──────────────────────────────────────────────────────────────────

function listRowStyle(active: boolean, archived: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: active ? "var(--rule-soft)" : "transparent",
    border: "none",
    borderTop: "1px solid var(--rule-soft)",
    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
    padding: "10px 16px",
    cursor: "pointer",
    font: "inherit",
    color: "var(--text)",
    opacity: archived ? 0.6 : 1,
    transition: "background 120ms ease, border-color 120ms ease",
  };
}

function primaryChip(active: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    padding: "4px 10px",
    background: active ? "var(--accent)" : "transparent",
    color:      active ? "var(--bg)"     : "var(--text)",
    border: `1px solid ${active ? "var(--accent)" : "var(--rule)"}`,
    borderRadius: 0,
    cursor: "pointer",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    font: "inherit", fontSize: 14,
    padding: "8px 10px",
    color: "var(--text)", background: "var(--bg)",
    border: "1px solid var(--rule)",
    borderRadius: 0, outline: "none",
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    resize: "vertical",
    fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
    lineHeight: 1.55,
  };
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 13,
    padding: "8px 16px",
    background: "var(--text)", color: "var(--bg)",
    border: "1px solid var(--text)",
    cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
  };
}

function secondaryBtn(busy: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 13,
    padding: "8px 16px",
    background: "transparent", color: "var(--text)",
    border: "1px solid var(--rule)",
    cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
  };
}

function dangerBtn(busy: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 13,
    padding: "8px 16px",
    background: "transparent", color: "var(--warn)",
    border: "1px solid color-mix(in srgb, var(--warn) 60%, var(--rule))",
    cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
  };
}


function uniqueOrdered(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of items) {
    const k = t.trim();
    if (!k || seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    out.push(k);
  }
  return out;
}

// ── one field per canonical section ───────────────────────────────────────
//
// Requirements / Qualifications / Nice to Have are entered item-by-item
// (each input is one item, "+ item" adds another). They're still stored as a
// single newline-joined string per section so the jsonb contract and the
// backend validation stay untouched — one line === one item.

const LIST_SECTION_KEYS = new Set<PositionSectionKey>([
  "requirements", "qualifications", "nice_to_have",
]);

// Sections shown in the form/detail. Technical Stack is intentionally omitted
// — the "Tecnologias" tag input already captures the stack. The key stays
// valid in the data model so any legacy data isn't rejected.
const FORM_SECTION_KEYS = (SECTION_KEYS as readonly PositionSectionKey[])
  .filter((k) => k !== "technical_stack");

function SectionFields({ disabled, sections, onChange }: {
  disabled: boolean;
  sections: Sections;
  onChange: (next: Sections) => void;
}) {
  const t = useT();
  function set(key: PositionSectionKey, value: string) {
    onChange({ ...sections, [key]: value });
  }
  return (
    <>
      {FORM_SECTION_KEYS.map((key) => (
        <Field key={key}
               label={t(`company.positions.section.${key}.label`)}
               hint={t(`company.positions.section.${key}.hint`)}>
          {LIST_SECTION_KEYS.has(key) ? (
            <ItemListField
              value={sections[key] ?? ""}
              disabled={disabled}
              placeholder={t(`company.positions.section.${key}.placeholder`)}
              onChange={(v) => set(key, v)} />
          ) : (
            <textarea
              value={sections[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
              disabled={disabled}
              rows={key === "responsibilities" ? 5 : 4}
              placeholder={t(`company.positions.section.${key}.placeholder`)}
              style={textareaStyle()} />
          )}
        </Field>
      ))}
    </>
  );
}

// Item-by-item editor backed by a newline-joined string. Each line is one
// item; "+ item" appends a blank input, "×" removes a row. An empty value
// still renders a single empty input so there's always somewhere to type.
function ItemListField({ value, disabled, placeholder, onChange }: {
  value:       string;
  disabled:    boolean;
  placeholder: string;
  onChange:    (next: string) => void;
}) {
  const t = useT();
  const items = value.length === 0 ? [""] : value.split("\n");

  function update(i: number, text: string) {
    const next = items.map((it, idx) => (idx === i ? text : it));
    onChange(next.join("\n"));
  }
  function add() {
    onChange([...items, ""].join("\n"));
  }
  function remove(i: number) {
    const next = items.filter((_, idx) => idx !== i);
    onChange(next.join("\n"));
  }

  return (
    <div className="grid gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span aria-hidden style={{ color: "var(--muted-soft)", fontSize: 13 }}>•</span>
          <input type="text" value={item} disabled={disabled}
                 onChange={(e) => update(i, e.target.value)}
                 onKeyDown={(e) => {
                   // Enter on a row adds the next item (faster bulk entry).
                   if (e.key === "Enter") { e.preventDefault(); add(); }
                 }}
                 placeholder={placeholder}
                 style={{ ...inputStyle(), flex: 1 }} />
          <button type="button" disabled={disabled || (items.length === 1 && item === "")}
                  onClick={() => remove(i)} aria-label={t("company.positions.section.remove_item")}
                  style={{
                    font: "inherit", fontSize: 15, lineHeight: 1,
                    width: 30, height: 30, padding: 0,
                    background: "transparent", color: "var(--muted)",
                    border: "1px solid var(--rule)",
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}>×</button>
        </div>
      ))}
      <div>
        <button type="button" disabled={disabled} onClick={add}
                style={{
                  font: "inherit", fontSize: 11.5,
                  padding: "4px 10px",
                  background: "transparent", color: "var(--accent)",
                  border: "1px dashed var(--accent)", borderRadius: 0,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}>
          {t("company.positions.section.add_item")}
        </button>
      </div>
    </div>
  );
}

// Strip empty / whitespace-only strings before sending to the backend so the
// server gets `{}` for fully blank forms instead of `{key: ""}` noise.
function sanitizeSections(s: Sections): PositionSections {
  const out: PositionSections = {};
  // Iterates FORM_SECTION_KEYS (sem technical_stack) — o stack foi fundido no
  // campo "Tecnologias", então nunca mais gravamos a seção technical_stack.
  for (const key of FORM_SECTION_KEYS) {
    const raw = s[key] ?? "";
    // List sections: drop blank/whitespace-only items, one per line.
    const v = LIST_SECTION_KEYS.has(key)
      ? raw.split("\n").map((l) => l.trim()).filter(Boolean).join("\n")
      : raw.trim();
    if (v) out[key] = v;
  }
  return out;
}

// Read-only render used by the detail panel. Falls back to the legacy
// `description` field when the position has no structured sections.
function SectionsView({ sections, fallback }: { sections?: Sections; fallback?: string | null }) {
  const t = useT();
  const filled = FORM_SECTION_KEYS
    .filter((k) => (sections?.[k] ?? "").trim().length > 0);

  if (filled.length === 0) {
    if (fallback && fallback.trim().length > 0) {
      return (
        <p style={{
          color: "var(--text)", fontSize: 14.5, lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
        }}>
          {fallback}
        </p>
      );
    }
    return (
      <p style={{ color: "var(--muted-soft)", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>
        {t("company.positions.sections_view.empty")}
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {filled.map((key) => (
        <div key={key}>
          <div className="font-mono uppercase"
               style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em", marginBottom: 8 }}>
            {t(`company.positions.section.${key}.label`)}
          </div>
          {LIST_SECTION_KEYS.has(key) ? (
            <ul style={{
              margin: 0, paddingLeft: 20,
              color: "var(--text)", fontSize: 14.5, lineHeight: 1.7,
              fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
            }}>
              {(sections?.[key] ?? "").split("\n").map((l) => l.trim()).filter(Boolean)
                .map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          ) : (
            <p style={{
              color: "var(--text)", fontSize: 14.5, lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
            }}>
              {sections?.[key]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── tech editor: chips + add input + suggestions from description ──────────

function TechEditor({ label, disabled, techs, onChange, source }: {
  label:    string;
  disabled: boolean;
  techs:    string[];
  onChange: (next: string[]) => void;
  source:   string;   // current description; used to derive "+ sugeridas"
}) {
  const t = useT();
  const [input, setInput] = useState("");

  // Suggestions = extracted from source that aren't already chips. Recompute
  // on every render — extractor is cheap and the description rarely thrashes.
  const suggested = (() => {
    if (!source) return [];
    const fromSource = extractTechnologies(source).technologies;
    const have = new Set(techs.map((t) => t.toLowerCase()));
    return fromSource.filter((t) => !have.has(t.toLowerCase()));
  })();

  function add(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (techs.some((t) => t.toLowerCase() === v.toLowerCase())) { setInput(""); return; }
    onChange([...techs, v]);
    setInput("");
  }

  function remove(t: string) {
    onChange(techs.filter((x) => x !== t));
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && techs.length > 0) {
      onChange(techs.slice(0, -1));
    }
  }

  return (
    <Field label={label} hint={t("company.positions.tech.hint")}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        padding: "8px 10px",
        background: "var(--bg)",
        border: "1px solid var(--rule)",
        minHeight: 42,
      }}>
        {techs.map((t) => (
          <TechChip key={t} label={t} onRemove={disabled ? undefined : () => remove(t)} />
        ))}
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKey}
               onBlur={() => input && add(input)}
               disabled={disabled}
               placeholder={techs.length === 0 ? t("company.positions.tech.placeholder") : ""}
               style={{
                 flex: "1 1 140px", minWidth: 120,
                 font: "inherit", fontSize: 13.5,
                 background: "transparent",
                 border: "none", outline: "none",
                 color: "var(--text)",
                 padding: "2px 4px",
               }} />
      </div>

      {suggested.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center" style={{ gap: 6 }}>
          <span className="font-mono uppercase"
                style={{ color: "var(--muted-soft)", fontSize: 10, letterSpacing: "0.12em" }}>
            {t("company.positions.tech.suggested")}
          </span>
          {suggested.map((s) => (
            <button key={s} type="button" disabled={disabled}
                    onClick={() => onChange(uniqueOrdered([...techs, s]))}
                    style={{
                      font: "inherit", fontSize: 11.5,
                      padding: "2px 8px",
                      background: "transparent",
                      color: "var(--accent)",
                      border: "1px dashed var(--accent)",
                      borderRadius: 0,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

// ── matches panel (P17) ────────────────────────────────────────────────────
//
// Sits below the criteria, above the description. Loads `/matches` for the
// currently selected position and renders two lists:
//   - Devs que correspondem (match) — ranked by score
//   - Devs próximos (near-miss)     — failed_signal labeled inline
// The "Recalcular" button re-runs the matcher on the server and replaces
// the local state with the fresh payload.

function PositionMatchesPanel({ position }: { position: Position }) {
  const t = useT();
  const fmt = useFmt();
  const [data,  setData]  = useState<PositionMatchesPayload | null>(null);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever the recruiter selects a different position. The
  // backend already recalculates inline on create/update, so this is just
  // a GET — no automatic POST here to avoid wasting a re-rank just for
  // toggling between views.
  const matchingEnabled = (position.thresholds ?? []).length > 0;
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    if (!matchingEnabled) return;
    (async () => {
      try {
        const r = await getPositionMatches(position.id);
        if (!cancelled) setData(r);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [position.id, matchingEnabled]);

  async function recalc() {
    setBusy(true);
    setError(null);
    try {
      const r = await recalculatePositionMatches(position.id);
      setData(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // No thresholds set → no matching → don't render the panel at all.
  if ((position.thresholds ?? []).length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-end" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-3">
          {data?.calculated_at && (
            <span className="font-mono"
                  style={{ color: "var(--muted-soft)", fontSize: 11, letterSpacing: "0.04em",
                            fontFeatureSettings: '"tnum"' }}>
              {t("company.positions.matches.calculated", { datetime: `${fmt.date(data.calculated_at, { day: "2-digit", month: "2-digit" })} ${fmt.time(data.calculated_at)}` })}
            </span>
          )}
          <button type="button" onClick={recalc} disabled={busy}
                  className="font-mono"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "none", border: "none", padding: 0,
                    font: "inherit", fontSize: 12, letterSpacing: "0.04em",
                    color: "var(--muted)",
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.45 : 1,
                    transition: "color 120ms ease",
                  }}
                  onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { if (!busy) e.currentTarget.style.color = "var(--muted)"; }}>
            <RecalcIcon spinning={busy} /> {busy ? t("company.positions.matches.recalc_busy") : t("company.positions.matches.recalc")}
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!data ? (
        <p style={{ color: "var(--muted-soft)", fontSize: 13, lineHeight: 1.7 }}>
          {t("company.positions.matches.loading")}
        </p>
      ) : (
        // key por position → reseta tab/página ao trocar de vaga
        <MatchesTabbed key={position.id} data={data} thresholds={position.thresholds ?? []} />
      )}
    </div>
  );
}

// Match confirmado | Near-miss em tabs, com paginação de 15 por aba.
const MATCHES_PER_PAGE = 15;

function MatchesTabbed({ data, thresholds }: { data: PositionMatchesPayload; thresholds: PositionThreshold[] }) {
  const t = useT();
  const [tab, setTab]   = useState<"match" | "near_miss">("match");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [tab]);   // troca de aba volta pra página 1

  const tabs = [
    { id: "match"     as const, label: t("company.positions.matches.tab.match"),     count: data.matches.length,   color: "var(--ok)" },
    { id: "near_miss" as const, label: t("company.positions.matches.tab.near_miss"), count: data.near_miss.length, color: "var(--warn)" },
  ];
  const rows    = tab === "match" ? data.matches : data.near_miss;
  const pages   = Math.max(1, Math.ceil(rows.length / MATCHES_PER_PAGE));
  const current = Math.min(page, pages);
  const start   = (current - 1) * MATCHES_PER_PAGE;
  const pageRows = rows.slice(start, start + MATCHES_PER_PAGE);

  return (
    <div>
      <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--rule)", marginBottom: 12 }}>
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on}
                    onClick={() => setTab(t.id)}
                    style={{
                      font: "inherit", fontSize: 12, letterSpacing: "0.04em", padding: "8px 14px",
                      background: "transparent", color: on ? "var(--text)" : "var(--muted)",
                      border: "none", borderBottom: `2px solid ${on ? t.color : "transparent"}`,
                      marginBottom: -1, cursor: "pointer",
                    }}>
              {t.label}{" "}
              <span className="font-mono"
                    style={{ color: on ? t.color : "var(--muted-soft)", fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "var(--muted-soft)", fontSize: 13, lineHeight: 1.6 }}>
          {tab === "match"
            ? t("company.positions.matches.empty.match")
            : t("company.positions.matches.empty.near_miss")}
        </p>
      ) : (
        <>
          <div>
            {pageRows.map((r, i) => <MatchRow key={r.account_id} row={r} first={i === 0} thresholds={thresholds} />)}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
              <span className="font-mono"
                    style={{ color: "var(--muted-soft)", fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                {t("company.positions.matches.range", { start: start + 1, end: Math.min(start + MATCHES_PER_PAGE, rows.length), total: rows.length })}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}
                        style={secondaryBtn(current <= 1)}>{t("company.positions.matches.prev")}</button>
                <span className="font-mono"
                      style={{ color: "var(--muted)", fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                  {current}/{pages}
                </span>
                <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}
                        style={secondaryBtn(current >= pages)}>{t("company.positions.matches.next")}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Inline link styled like CompanyNav's "Dashboard | Directory" — muted mono
// text + leading 11px stroke icon, hovers to accent. `external` opens in
// a new tab.
function MatchNavLink({ href, external, icon, children }: {
  href: string; external?: boolean; icon: ReactNode; children: ReactNode;
}) {
  return (
    <a href={href}
       {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
       style={{
         display: "inline-flex", alignItems: "center", gap: 6,
         color: "var(--muted)", textDecoration: "none",
         transition: "color 120ms ease",
       }}
       onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
       onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
      {icon} {children}
    </a>
  );
}

// Circular arrow — refresh/recalc icon. Optional `spinning` adds a CSS
// rotation while the recalc is in flight.
function RecalcIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{
           flexShrink: 0,
           animation: spinning ? "beheld-spin 900ms linear infinite" : undefined,
           transformOrigin: "center",
         }}>
      <path d="M9.5 5.5 A4 4 0 1 1 8.4 2.6" stroke="currentColor" strokeLinecap="round" />
      <path d="M9.5 1 L9.5 3 L7.5 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <style>{`@keyframes beheld-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// User silhouette — profile icon, sized to match CompanyNav's icons (11px).
function ProfileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <circle cx="5.5" cy="3.5" r="2" stroke="currentColor" />
      <path d="M1.5 10.5 C1.5 7.5 3.5 6.5 5.5 6.5 C7.5 6.5 9.5 7.5 9.5 10.5" stroke="currentColor" />
    </svg>
  );
}

// Envelope — contact/message icon.
function ContactIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <rect x="0.5" y="2" width="10" height="7" stroke="currentColor" />
      <path d="M0.5 2.5 L5.5 6 L10.5 2.5" stroke="currentColor" />
    </svg>
  );
}

function MatchRow({ row, first, thresholds }: { row: PositionMatchRow; first: boolean; thresholds: PositionThreshold[] }) {
  const t = useT();
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto auto",
      gap: 14, alignItems: "center",
      padding: "10px 14px",
      borderTop: first ? "none" : "1px solid var(--rule-soft)",
    }}>
      <span className="font-mono"
            style={{ color: "var(--accent)", fontSize: 16, fontWeight: 600,
                      fontFeatureSettings: '"tnum"', minWidth: 44, textAlign: "right" }}>
        {row.score}%
      </span>
      <div>
        <div style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.4 }}>
          {row.bundle_slug
            ? <a href={`/v/${row.bundle_slug}`}
                 style={{ color: "var(--text)", textDecoration: "underline",
                          textDecorationColor: "var(--rule)", textUnderlineOffset: 3 }}>
                {row.dev_handle}
              </a>
            : <span>{row.dev_handle}</span>}
        </div>
        {row.match_type === "near_miss" && row.failed_signal && (
          <NearMissDetail row={row} />
        )}
        {row.match_type === "match" && (
          <MatchDetail row={row} thresholds={thresholds} />
        )}
      </div>
      <span className="font-mono"
            style={{ display: "inline-flex", alignItems: "center", gap: 10,
                     fontSize: 12, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
        {row.bundle_slug && (
          <>
            <MatchNavLink href={`/v/${row.bundle_slug}`} external icon={<ProfileIcon />}>
              {t("company.positions.matches.view_profile")}
            </MatchNavLink>
            <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
          </>
        )}
        <MatchNavLink href={`/accounts/${row.account_id}/contact`} icon={<ContactIcon />}>
          {t("company.positions.matches.contact")}
        </MatchNavLink>
      </span>
    </div>
  );
}

// Positive analogue of NearMissDetail: same line shape — "passou: <signal
// label>" + numeric gap when available + CurveBadge. We surface the
// test_ratio signal when it's part of the position's thresholds (curve
// data gives us the current value), otherwise fall back to a generic
// "todos os sinais" line so the structure still matches visually.
function MatchDetail({ row, thresholds }: { row: PositionMatchRow; thresholds: PositionThreshold[] }) {
  const t = useT();
  const tr = thresholds.find((th) => th.signal === "test_ratio");
  const trThreshold = tr && "number" in tr.value ? tr.value.number : null;
  const trCurrent   = row.curve?.current ?? null;
  const showTestRatio = trThreshold != null && trCurrent != null;

  return (
    <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2, lineHeight: 1.55 }}>
      {t("company.positions.match.passed")}{" "}
      {showTestRatio ? (
        <>
          <strong style={{ color: "var(--ok)" }}>{t("company.positions.signal.test_ratio.label")}</strong>
          <span style={{ marginLeft: 6, fontFeatureSettings: '"tnum"' }}>
            {t("company.positions.near_miss.test_ratio", { current: Number(trCurrent.toFixed(1)), threshold: trThreshold })}
          </span>
        </>
      ) : (
        <strong style={{ color: "var(--ok)" }}>{t("company.positions.match.all_signals")}</strong>
      )}
      <CurveBadge curve={row.curve} />
    </div>
  );
}

// Renders the "falhou: …" inline detail under a near-miss row, plus the
// evolution curve when the failed signal is `test_ratio` (the only signal
// the backend tracks a curve for, per spec section 11).
function NearMissDetail({ row }: { row: PositionMatchRow }) {
  const t = useT();
  const signal = row.failed_signal!;
  const detail = row.failed_detail ?? {};
  return (
    <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2, lineHeight: 1.55 }}>
      {t("company.positions.near_miss.failed")} <strong style={{ color: "var(--warn)" }}>{t(`company.positions.signal.${signal}.label`)}</strong>
      {signal === "test_ratio" && detail.current != null && detail.threshold != null && (
        <span style={{ marginLeft: 6, fontFeatureSettings: '"tnum"' }}>
          {t("company.positions.near_miss.test_ratio", { current: detail.current, threshold: detail.threshold })}
        </span>
      )}
      {signal === "recency" && detail.current != null && detail.threshold != null && (
        <span style={{ marginLeft: 6, fontFeatureSettings: '"tnum"' }}>
          {t("company.positions.near_miss.recency", { current: Math.round(detail.current), threshold: detail.threshold })}
        </span>
      )}
      {signal === "ecosystems" && detail.missing_items && detail.missing_items.length > 0 && (
        <span style={{ marginLeft: 6 }}>
          {t("company.positions.near_miss.ecosystems", { items: detail.missing_items.join(", ") })}
        </span>
      )}
      <CurveBadge curve={row.curve} />
    </div>
  );
}

function CurveBadge({ curve }: { curve?: import("@/lib/companyDashboardApi").PositionCurve }) {
  const t = useT();
  if (!curve || curve.status === "not_applicable" || curve.status === "none") return null;
  if (curve.status === "building") {
    return (
      <span className="font-mono" style={{
        marginLeft: 10, color: "var(--muted-soft)",
        fontSize: 11, letterSpacing: "0.04em", fontFeatureSettings: '"tnum"',
      }}>
        {t("company.positions.curve.building", { points: curve.points ?? 1 })}
      </span>
    );
  }
  const arrow = curve.trend === "up" ? "↑" : curve.trend === "down" ? "↓" : "→";
  const color = curve.trend === "up" ? "var(--ok)"
              : curve.trend === "down" ? "var(--warn)"
              : "var(--muted-soft)";
  const sign  = (curve.delta ?? 0) > 0 ? "+" : "";
  return (
    <span className="font-mono" style={{
      marginLeft: 10, color, fontSize: 11, letterSpacing: "0.04em",
      fontFeatureSettings: '"tnum"',
    }}>
      {t("company.positions.curve.trend", { arrow, sign, delta: curve.delta ?? 0, period: curve.period_days ?? 0, points: curve.points ?? 0 })}
    </span>
  );
}

// ── status chip ────────────────────────────────────────────────────────────

function PositionStatusChip({ status }: { status: Position["status"] }) {
  const t = useT();
  const palette = status === "active"
    ? { bg: "rgba(74,124,78,0.12)", fg: "var(--ok)",   bd: "rgba(74,124,78,0.4)" }
    : status === "expired"
    ? { bg: "rgba(181,97,53,0.12)", fg: "var(--warn)", bd: "rgba(181,97,53,0.4)" }
    : { bg: "var(--rule-soft)",     fg: "var(--muted)", bd: "var(--rule)" };
  return (
    <span style={{
      marginLeft: 8, padding: "2px 8px",
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.bd}`,
      fontSize: 9, letterSpacing: "0.14em",
    }}>
      {t(`company.positions.status.${status}`)}
    </span>
  );
}

// "expira DD/MM/YYYY" — texto plano, ancorado à direita do cabeçalho da
// vaga. Só renderiza para vagas ativas com data de expiração definida.
function PositionExpiresLine({ status, expiresAt }: {
  status: Position["status"]; expiresAt: string | null;
}) {
  const t = useT();
  const fmt = useFmt();
  if (status !== "active" || !expiresAt) return null;
  return (
    <span className="font-mono"
          style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.04em",
                   fontFeatureSettings: '"tnum"', whiteSpace: "nowrap" }}>
      {t("company.positions.status.expires", { date: fmt.date(expiresAt) })}
    </span>
  );
}

// ── match criteria read-only view (detail panel) ───────────────────────────

function MatchCriteriaView({ position }: { position: Position }) {
  const tr = useT();
  const thresholds = position.thresholds ?? [];
  const priorities = (position.priorities ?? []).slice().sort((a, b) => a.ranking - b.ranking);
  if (thresholds.length === 0 && priorities.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
        {tr("company.positions.criteria_view.title")}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {thresholds.map((t) => (
          <div key={t.signal} style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55 }}>
            <strong style={{ fontWeight: 600 }}>{tr(`company.positions.signal.${t.signal}.label`)}</strong>
            <span style={{ color: "var(--muted)" }}>{" — "}</span>
            {t.signal === "ecosystems" && "items" in t.value && (
              <span>{tr("company.positions.criteria_view.includes", { items: t.value.items.join(", ") })}</span>
            )}
            {t.signal === "test_ratio" && "number" in t.value && (
              <span>{tr("company.positions.criteria_view.gte", { n: t.value.number })}</span>
            )}
            {t.signal === "recency" && "number" in t.value && (
              <span>{tr("company.positions.criteria_view.lte", { n: t.value.number })}</span>
            )}
            {priorityFor(priorities, t.signal as PositionSignal) && (
              <span className="font-mono"
                    style={{ marginLeft: 8, color: "var(--accent)", fontSize: 11,
                              letterSpacing: "0.06em", fontFeatureSettings: '"tnum"' }}>
                · {tr("company.positions.criteria_view.priority", { rank: priorityFor(priorities, t.signal as PositionSignal) ?? 0, weight: Math.round((priorities.find((p) => p.signal === t.signal)?.weight ?? 0) * 100) })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function priorityFor(priorities: Position["priorities"], signal: PositionSignal): number | null {
  const p = priorities.find((x) => x.signal === signal);
  return p ? p.ranking : null;
}

// ── match criteria editor (thresholds + priorities ranking) ────────────────
//
// Local form-state shape — three signals, each either off or carrying its
// threshold value. `ranking` is the array order of the entries in
// `priorityOrder`; sinais sem priority are excluded from the score formula.

interface MatchCriteria {
  ecosystems:    { enabled: boolean; items: string[] };
  test_ratio:    { enabled: boolean; min: number };       // percent 0..100
  recency:       { enabled: boolean; maxDays: number };
  priorityOrder: PositionSignal[];                        // top → bottom = ranking 1..N
}

function initialCriteria(): MatchCriteria {
  return {
    ecosystems:    { enabled: false, items: [] },
    test_ratio:    { enabled: false, min: 30 },
    recency:       { enabled: false, maxDays: 30 },
    priorityOrder: [],
  };
}

function criteriaFromPosition(p: Position): MatchCriteria {
  const c = initialCriteria();
  for (const t of p.thresholds ?? []) {
    if (t.signal === "ecosystems" && "items" in t.value) {
      c.ecosystems = { enabled: true, items: t.value.items };
    } else if (t.signal === "test_ratio" && "number" in t.value) {
      c.test_ratio = { enabled: true, min: t.value.number };
    } else if (t.signal === "recency" && "number" in t.value) {
      c.recency = { enabled: true, maxDays: t.value.number };
    }
  }
  c.priorityOrder = (p.priorities ?? [])
    .slice()
    .sort((a, b) => a.ranking - b.ranking)
    .map((pr) => pr.signal);
  return c;
}

// PP-VAL §9.3 — hard validation antes do submit. Espelha a regra do
// servidor ("Ao menos um threshold deve ser definido para ativar o
// matching") + cobre o caso degenerado "ecosystems habilitado sem nenhum
// item selecionado". Retorna a mensagem de erro a exibir ou null se OK.
function validateCriteria(c: MatchCriteria, t: (k: string) => string): string | null {
  const enabledSignals: PositionSignal[] = [];
  if (c.ecosystems.enabled) {
    if (c.ecosystems.items.length === 0) {
      return t("company.positions.criteria.err_ecosystem");
    }
    enabledSignals.push("ecosystems");
  }
  if (c.test_ratio.enabled) enabledSignals.push("test_ratio");
  if (c.recency.enabled)    enabledSignals.push("recency");
  if (enabledSignals.length === 0) {
    return t("company.positions.criteria.err_none");
  }
  return null;
}

function buildCriteriaPayload(c: MatchCriteria): {
  thresholds: PositionThreshold[];
  priorities: Array<{ signal: PositionSignal }>;
} {
  const thresholds: PositionThreshold[] = [];
  if (c.ecosystems.enabled && c.ecosystems.items.length > 0) {
    thresholds.push({ signal: "ecosystems", operator: "includes", value: { items: c.ecosystems.items } });
  }
  if (c.test_ratio.enabled) {
    thresholds.push({ signal: "test_ratio", operator: "gte", value: { number: c.test_ratio.min } });
  }
  if (c.recency.enabled) {
    thresholds.push({ signal: "recency", operator: "lte", value: { number: c.recency.maxDays } });
  }
  // Prune priorities to signals that are actually enabled. Order preserved.
  const enabled = new Set<PositionSignal>(thresholds.map((t) => t.signal));
  const priorities = c.priorityOrder
    .filter((s) => enabled.has(s))
    .slice(0, 4)
    .map((s) => ({ signal: s }));
  return { thresholds, priorities };
}

function MatchCriteriaEditor({ disabled, value, onChange }: {
  disabled: boolean;
  value:    MatchCriteria;
  onChange: (next: MatchCriteria) => void;
}) {
  const t = useT();
  // Keep priorityOrder in sync with enabled signals. When a recruiter
  // disables a signal, drop it from the ordering. When they enable one,
  // append at the end (lowest priority by default).
  function setSignal<K extends keyof MatchCriteria>(key: K, patch: Partial<MatchCriteria[K]>) {
    if (key === "priorityOrder") return;          // not editable through this path
    const next = { ...value, [key]: { ...(value[key] as object), ...patch } } as MatchCriteria;
    syncOrder(next);
    onChange(next);
  }

  function syncOrder(next: MatchCriteria) {
    const enabledNow: PositionSignal[] = [];
    (["ecosystems", "test_ratio", "recency"] as PositionSignal[]).forEach((s) => {
      if (next[s].enabled) enabledNow.push(s);
    });
    // Preserve existing order for signals still enabled.
    const stable = next.priorityOrder.filter((s) => enabledNow.includes(s));
    // Append newcomers in their canonical order.
    for (const s of enabledNow) if (!stable.includes(s)) stable.push(s);
    next.priorityOrder = stable;
  }

  // PF.9 — reorder by dropping item `from` onto slot `to`.
  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const order = [...value.priorityOrder];
    if (from >= order.length || to >= order.length) return;
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    onChange({ ...value, priorityOrder: order });
  }

  const weightFor = (rank: number) => [0.40, 0.30, 0.20, 0.10][rank - 1] ?? 0;

  return (
    <Field label={t("company.positions.criteria.field_label")} hint={t("company.positions.criteria.field_hint")}>
      <div style={{
        padding: 14, display: "grid", gap: 14,
      }}>
        {/* ecosystems — opções fixas da spec PP-VAL §9.2 */}
        <SignalRow
          signal="ecosystems"
          enabled={value.ecosystems.enabled}
          disabled={disabled}
          onToggle={(v) => setSignal("ecosystems", { enabled: v })}
        >
          <EcosystemPicker
            disabled={disabled || !value.ecosystems.enabled}
            value={value.ecosystems.items}
            onChange={(items) => setSignal("ecosystems", { items })} />
        </SignalRow>

        {/* test_ratio — PF.8 slider sincronizado com input numérico */}
        <SignalRow
          signal="test_ratio"
          enabled={value.test_ratio.enabled}
          disabled={disabled}
          onToggle={(v) => setSignal("test_ratio", { enabled: v })}
        >
          <RangeSlider
            disabled={disabled || !value.test_ratio.enabled}
            value={value.test_ratio.min}
            min={0} max={100}
            onChange={(n) => setSignal("test_ratio", { min: n })} />
          {value.test_ratio.enabled && value.test_ratio.min > 0 && (
            <p style={{ color: "var(--muted-soft)", fontSize: 12, lineHeight: 1.5, margin: "6px 0 0" }}>
              {t("company.positions.criteria.test_ratio_help", { n: value.test_ratio.min })}
            </p>
          )}
        </SignalRow>

        {/* recency */}
        <SignalRow
          signal="recency"
          enabled={value.recency.enabled}
          disabled={disabled}
          onToggle={(v) => setSignal("recency", { enabled: v })}
        >
          <NumberInput
            disabled={disabled || !value.recency.enabled}
            value={value.recency.maxDays}
            min={1} max={365} step={1} suffix={t("company.positions.criteria.recency_suffix")}
            onChange={(n) => setSignal("recency", { maxDays: n })} />
          {value.recency.enabled && value.recency.maxDays > 0 && (
            <p style={{ color: "var(--muted-soft)", fontSize: 12, lineHeight: 1.5, margin: "6px 0 0" }}>
              {t("company.positions.criteria.recency_help", { n: value.recency.maxDays })}
            </p>
          )}
        </SignalRow>

        {/* priorities — PF.9 drag to rank, apenas critérios habilitados */}
        {value.priorityOrder.length > 0 && (
          <PriorityRankList
            order={value.priorityOrder}
            disabled={disabled}
            weightFor={weightFor}
            onReorder={reorder} />
        )}

        {value.priorityOrder.length === 0 && (
          <p style={{ color: "var(--muted-soft)", fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
            {t("company.positions.criteria.priority_empty")}
          </p>
        )}
      </div>
    </Field>
  );
}

// PF.9 — HTML5 drag-to-rank list. Only enabled criteria are passed in
// (`order`), so the list never shows a signal that isn't an active threshold.
// Weights redistribute live as items move (1º=40%, 2º=30%, 3º=20%, 4º=10%).
function PriorityRankList({ order, disabled, weightFor, onReorder }: {
  order:     PositionSignal[];
  disabled:  boolean;
  weightFor: (rank: number) => number;
  onReorder: (from: number, to: number) => void;
}) {
  const t = useT();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <div style={{ paddingTop: 8, borderTop: "1px dashed var(--rule)" }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
        {t("company.positions.criteria.priority_title")}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
        {order.map((signal, idx) => (
          <li key={signal}
              draggable={!disabled}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null) onReorder(dragIdx, idx);
                setDragIdx(null); setOverIdx(null);
              }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              style={{
                display: "grid", gridTemplateColumns: "auto auto 1fr auto",
                alignItems: "center", gap: 8,
                padding: "6px 10px",
                background: "var(--card-bg)",
                border: `1px solid ${overIdx === idx && dragIdx !== null ? "var(--accent)" : "var(--rule)"}`,
                opacity: dragIdx === idx ? 0.4 : 1,
                cursor: disabled ? "default" : "grab",
              }}>
            <span aria-hidden style={{ color: "var(--muted-soft)", fontSize: 13, lineHeight: 1 }}>☰</span>
            <span className="font-mono"
                  style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.08em",
                            fontFeatureSettings: '"tnum"', minWidth: 14, textAlign: "center" }}>
              {idx + 1}º
            </span>
            <span style={{ color: "var(--text)", fontSize: 13.5 }}>
              {t(`company.positions.signal.${signal}.label`)}
            </span>
            <span className="font-mono"
                  style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.04em",
                            fontFeatureSettings: '"tnum"' }}>
              {t("company.positions.criteria.priority_weight", { pct: Math.round(weightFor(idx + 1) * 100) })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// PF.8 — slider + number input kept in sync; both clamp to [min, max].
function RangeSlider({ disabled, value, min, max, onChange }: {
  disabled: boolean;
  value:    number;
  min:      number;
  max:      number;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-3" style={{ opacity: disabled ? 0.5 : 1 }}>
      <input type="range" min={min} max={max} value={value} disabled={disabled}
             onChange={(e) => onChange(clamp(Number(e.target.value)))}
             style={{ flex: 1, accentColor: "var(--accent)", cursor: disabled ? "not-allowed" : "pointer" }} />
      <input type="number" min={min} max={max} value={value} disabled={disabled}
             onChange={(e) => {
               const n = Number(e.target.value);
               if (Number.isFinite(n)) onChange(clamp(n));
             }}
             style={{ ...inputStyle(), width: 64 }} />
      <span style={{ color: "var(--muted)", fontSize: 12.5 }}>%</span>
    </div>
  );
}

function SignalRow({ signal, enabled, disabled, onToggle, children }: {
  signal:   PositionSignal;
  enabled:  boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label className="flex items-center gap-2"
             style={{ cursor: disabled ? "not-allowed" : "pointer", userSelect: "none" }}>
        <input type="checkbox" checked={enabled} disabled={disabled}
               onChange={(e) => onToggle(e.target.checked)}
               style={{ width: 14, height: 14, accentColor: "var(--accent)" }} />
        <span className="font-mono uppercase"
              style={{ color: "var(--text)", fontSize: 11, letterSpacing: "0.14em" }}>
          {t(`company.positions.signal.${signal}.label`)}
        </span>
        <span style={{ color: "var(--muted-soft)", fontSize: 12 }}>· {t(`company.positions.signal.${signal}.hint`)}</span>
      </label>
      <div style={{ marginLeft: 22 }}>{children}</div>
    </div>
  );
}

// PP-VAL §9.2 — ecosystems com opções FIXAS conforme spec. Substitui o
// input freeform anterior por uma seleção canônica de seis ecossistemas
// que o motor de matching consegue reconhecer no `bundle_data.payload.l1.
// ecosystems`. Os valores armazenados são strings minúsculas (mesma forma
// que o matcher compara).
const ECOSYSTEM_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "rails",    label: "Rails"   },
  { value: "node",     label: "Node"    },
  { value: "python",   label: "Python"  },
  { value: "flutter",  label: "Flutter" },
  { value: "react",    label: "React"   },
  { value: "devops",   label: "DevOps"  },
];

function EcosystemPicker({ disabled, value, onChange }: {
  disabled: boolean;
  value:    string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else                     onChange([...value, opt]);
  }
  return (
    <div className="flex flex-wrap" style={{ gap: 6, opacity: disabled ? 0.5 : 1 }}>
      {ECOSYSTEM_OPTIONS.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(opt.value)}
                  aria-pressed={selected}
                  style={{
                    font: "inherit", fontSize: 12.5,
                    padding: "5px 12px",
                    background: selected ? "var(--accent)"   : "transparent",
                    color:      selected ? "var(--bg)"       : "var(--text)",
                    border:     `1px solid ${selected ? "var(--accent)" : "var(--rule)"}`,
                    borderRadius: 0,
                    cursor: disabled ? "not-allowed" : "pointer",
                    letterSpacing: "0.02em",
                  }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({ disabled, value, min, max, step, suffix, onChange }: {
  disabled: boolean;
  value:    number;
  min:      number;
  max:      number;
  step:     number;
  suffix:   string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={value}
             min={min} max={max} step={step} disabled={disabled}
             onChange={(e) => {
               const n = Number(e.target.value);
               if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
             }}
             style={{ ...inputStyle(), width: 100, opacity: disabled ? 0.5 : 1 }} />
      <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{suffix}</span>
    </div>
  );
}

// ── tech chip (used both in detail view + tech editor) ────────────────────

function TechChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  const t = useT();
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px",
      background: "var(--rule-soft)",
      color: "var(--text)",
      border: "1px solid var(--rule)",
      fontSize: 12,
      letterSpacing: "0.01em",
    }}>
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove}
                aria-label={t("company.positions.tech.remove", { label })}
                style={{
                  background: "none", border: "none", padding: 0,
                  color: "var(--muted)", cursor: "pointer", fontSize: 13,
                  lineHeight: 1, marginLeft: 2,
                }}>
          ×
        </button>
      )}
    </span>
  );
}
