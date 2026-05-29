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

function DetailPanel({ position, onEdit, onArchive, onReactivate, onPurge }: {
  position:     Position;
  onEdit:       () => void;
  onArchive:    () => void;
  onReactivate: () => void | Promise<void>;
  onPurge:      () => void | Promise<void>;
}) {
  const t = useT();
  const fmt = useFmt();
  return (
    <div style={{ padding: 28 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono uppercase"
             style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
          {t("company.positions.detail.eyebrow")}
          <PositionStatusChip status={position.status} expiresAt={position.expires_at} />
        </div>
        {/* Ações da vaga arquivada — ícones no topo direito, tooltip no hover */}
        {position.archived && (
          <ArchivedActions onReactivate={onReactivate} onPurge={onPurge} />
        )}
      </div>

      <h3 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 22, letterSpacing: "-0.02em", marginTop: 8, lineHeight: 1.25 }}>
        {position.title}
      </h3>

      {Object.keys(position.location ?? {}).length > 0 && (
        <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
          {formatLocation(position.location)}
        </div>
      )}

      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 8,
                     letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        {t("company.positions.detail.created", { date: fmt.date(position.created_at) })}
        {position.archived_at && <> · {t("company.positions.detail.archived_at", { date: fmt.date(position.archived_at) })}</>}
      </div>

      {position.technologies && position.technologies.length > 0 && (
        <div style={{ marginTop: 16 }}>
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

      <PositionMatchesPanel position={position} />

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--rule-soft)" }}>
        <SectionsView sections={position.sections} fallback={position.description} />
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

  return (
    <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
      <button type="button" onClick={onEdit}    style={secondaryBtn(false)}>{t("company.positions.actions.edit")}</button>
      <button type="button" onClick={onArchive} style={dangerBtn(false)}>{t("company.positions.actions.archive")}</button>
    </div>
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
    const criteriaError = validateCriteria(criteria);
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
    const criteriaError = validateCriteria(criteria);
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
    <Field label={label} hint="enter ou vírgula para adicionar — clique × para remover">
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
               placeholder={techs.length === 0 ? "ex: React, PostgreSQL, AWS…" : ""}
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
            sugeridas da descrição:
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
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--rule-soft)" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div className="font-mono uppercase"
             style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
          devs que correspondem
        </div>
        <div className="flex items-center gap-3">
          {data?.calculated_at && (
            <span className="font-mono"
                  style={{ color: "var(--muted-soft)", fontSize: 11, letterSpacing: "0.04em",
                            fontFeatureSettings: '"tnum"' }}>
              calculado {formatDateTimeShort(data.calculated_at)}
            </span>
          )}
          <button type="button" onClick={recalc} disabled={busy} style={secondaryBtn(busy)}>
            {busy ? "Recalculando…" : "Recalcular"}
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!data ? (
        <p style={{ color: "var(--muted-soft)", fontSize: 13, lineHeight: 1.7 }}>
          Carregando matches…
        </p>
      ) : (
        // key por position → reseta tab/página ao trocar de vaga
        <MatchesTabbed key={position.id} data={data} />
      )}
    </div>
  );
}

// Match confirmado | Near-miss em tabs, com paginação de 15 por aba.
const MATCHES_PER_PAGE = 15;

function MatchesTabbed({ data }: { data: PositionMatchesPayload }) {
  const [tab, setTab]   = useState<"match" | "near_miss">("match");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [tab]);   // troca de aba volta pra página 1

  const tabs = [
    { id: "match"     as const, label: "Match confirmado", count: data.matches.length,   color: "var(--ok)" },
    { id: "near_miss" as const, label: "Near-miss",        count: data.near_miss.length, color: "var(--warn)" },
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
            ? "Nenhum dev passou todos os thresholds hoje."
            : "Nenhum dev caiu dentro da margem de near-miss."}
        </p>
      ) : (
        <>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
            {pageRows.map((r, i) => <MatchRow key={r.account_id} row={r} first={i === 0} />)}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
              <span className="font-mono"
                    style={{ color: "var(--muted-soft)", fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                {start + 1}–{Math.min(start + MATCHES_PER_PAGE, rows.length)} de {rows.length}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}
                        style={secondaryBtn(current <= 1)}>← anterior</button>
                <span className="font-mono"
                      style={{ color: "var(--muted)", fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                  {current}/{pages}
                </span>
                <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)}
                        style={secondaryBtn(current >= pages)}>próxima →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatchRow({ row, first }: { row: PositionMatchRow; first: boolean }) {
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
      </div>
      {row.bundle_slug && (
        <a href={`/v/${row.bundle_slug}`} target="_blank" rel="noopener noreferrer"
           style={{
             font: "inherit", fontSize: 11.5,
             padding: "5px 12px",
             background: "transparent", color: "var(--text)",
             border: "1px solid var(--rule)",
             textDecoration: "none", whiteSpace: "nowrap",
           }}>
          Ver perfil →
        </a>
      )}
      <a href={`/accounts/${row.account_id}/contact`}
         style={{
           font: "inherit", fontSize: 11.5,
           padding: "5px 12px",
           background: "var(--text)", color: "var(--bg)",
           border: "1px solid var(--text)",
           textDecoration: "none", whiteSpace: "nowrap",
         }}>
        Contatar
      </a>
    </div>
  );
}

// Renders the "falhou: …" inline detail under a near-miss row, plus the
// evolution curve when the failed signal is `test_ratio` (the only signal
// the backend tracks a curve for, per spec section 11).
function NearMissDetail({ row }: { row: PositionMatchRow }) {
  const signal = row.failed_signal!;
  const detail = row.failed_detail ?? {};
  return (
    <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2, lineHeight: 1.55 }}>
      falhou: <strong style={{ color: "var(--warn)" }}>{SIGNAL_LABELS[signal]}</strong>
      {signal === "test_ratio" && detail.current != null && detail.threshold != null && (
        <span style={{ marginLeft: 6, fontFeatureSettings: '"tnum"' }}>
          ({detail.current}% · exigido: {detail.threshold}%)
        </span>
      )}
      {signal === "recency" && detail.current != null && detail.threshold != null && (
        <span style={{ marginLeft: 6, fontFeatureSettings: '"tnum"' }}>
          ({Math.round(detail.current)}d · exigido: ≤ {detail.threshold}d)
        </span>
      )}
      {signal === "ecosystems" && detail.missing_items && detail.missing_items.length > 0 && (
        <span style={{ marginLeft: 6 }}>
          (ausente: {detail.missing_items.join(", ")})
        </span>
      )}
      <CurveBadge curve={row.curve} />
    </div>
  );
}

function CurveBadge({ curve }: { curve?: import("@/lib/companyDashboardApi").PositionCurve }) {
  if (!curve || curve.status === "not_applicable" || curve.status === "none") return null;
  if (curve.status === "building") {
    return (
      <span className="font-mono" style={{
        marginLeft: 10, color: "var(--muted-soft)",
        fontSize: 11, letterSpacing: "0.04em", fontFeatureSettings: '"tnum"',
      }}>
        · curva: em construção ({curve.points ?? 1} ponto)
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
      · curva: {arrow} {sign}{curve.delta}% em {curve.period_days}d ({curve.points} bundles)
    </span>
  );
}

function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── status chip ────────────────────────────────────────────────────────────

function PositionStatusChip({ status, expiresAt }: { status: Position["status"]; expiresAt: string | null }) {
  const t = useT();
  const fmt = useFmt();
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
      {status === "active" && expiresAt && (
        <span style={{ marginLeft: 6, opacity: 0.8, fontFeatureSettings: '"tnum"' }}>
          · {t("company.positions.status.expires", { date: fmt.date(expiresAt) })}
        </span>
      )}
    </span>
  );
}

// ── match criteria read-only view (detail panel) ───────────────────────────

function MatchCriteriaView({ position }: { position: Position }) {
  const thresholds = position.thresholds ?? [];
  const priorities = (position.priorities ?? []).slice().sort((a, b) => a.ranking - b.ranking);
  if (thresholds.length === 0 && priorities.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
        critérios de match
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {thresholds.map((t) => (
          <div key={t.signal} style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55 }}>
            <strong style={{ fontWeight: 600 }}>{SIGNAL_LABELS[t.signal as PositionSignal]}</strong>
            <span style={{ color: "var(--muted)" }}>{" — "}</span>
            {t.signal === "ecosystems" && "items" in t.value && (
              <span>inclui {t.value.items.join(", ")}</span>
            )}
            {t.signal === "test_ratio" && "number" in t.value && (
              <span>≥ {t.value.number}%</span>
            )}
            {t.signal === "recency" && "number" in t.value && (
              <span>≤ {t.value.number} dias</span>
            )}
            {priorityFor(priorities, t.signal as PositionSignal) && (
              <span className="font-mono"
                    style={{ marginLeft: 8, color: "var(--accent)", fontSize: 11,
                              letterSpacing: "0.06em", fontFeatureSettings: '"tnum"' }}>
                · {priorityFor(priorities, t.signal as PositionSignal)}º · peso {Math.round((priorities.find((p) => p.signal === t.signal)?.weight ?? 0) * 100)}%
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
function validateCriteria(c: MatchCriteria): string | null {
  const enabledSignals: PositionSignal[] = [];
  if (c.ecosystems.enabled) {
    if (c.ecosystems.items.length === 0) {
      return "Selecione ao menos um ecosystem ou desative o critério.";
    }
    enabledSignals.push("ecosystems");
  }
  if (c.test_ratio.enabled) enabledSignals.push("test_ratio");
  if (c.recency.enabled)    enabledSignals.push("recency");
  if (enabledSignals.length === 0) {
    return "Defina ao menos um critério de match (ecosystems, test ratio ou recência).";
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

const SIGNAL_LABELS: Record<PositionSignal, string> = {
  ecosystems: "Ecosystems",
  test_ratio: "Test ratio",
  recency:    "Recência",
};
const SIGNAL_HINTS: Record<PositionSignal, string> = {
  ecosystems: "ecossistemas que o dev deve ter publicado",
  test_ratio: "proporção mínima de testes (0–100%)",
  recency:    "dias máximos desde o último bundle",
};

function MatchCriteriaEditor({ disabled, value, onChange }: {
  disabled: boolean;
  value:    MatchCriteria;
  onChange: (next: MatchCriteria) => void;
}) {
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
    <Field label="Critérios de match" hint="thresholds que o dev precisa atender + ordem de prioridade">
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
              Devs com test maturity score abaixo de {value.test_ratio.min} não serão incluídos nos matches.
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
            min={1} max={365} step={1} suffix="dias máximo"
            onChange={(n) => setSignal("recency", { maxDays: n })} />
          {value.recency.enabled && value.recency.maxDays > 0 && (
            <p style={{ color: "var(--muted-soft)", fontSize: 12, lineHeight: 1.5, margin: "6px 0 0" }}>
              Devs sem bundle publicado nos últimos {value.recency.maxDays} dias não serão incluídos nos matches.
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
            Ative pelo menos um sinal acima para definir a prioridade do matching.
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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <div style={{ paddingTop: 8, borderTop: "1px dashed var(--rule)" }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
        prioridade — arraste para reordenar
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
              {SIGNAL_LABELS[signal]}
            </span>
            <span className="font-mono"
                  style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.04em",
                            fontFeatureSettings: '"tnum"' }}>
              peso {Math.round(weightFor(idx + 1) * 100)}%
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
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label className="flex items-center gap-2"
             style={{ cursor: disabled ? "not-allowed" : "pointer", userSelect: "none" }}>
        <input type="checkbox" checked={enabled} disabled={disabled}
               onChange={(e) => onToggle(e.target.checked)}
               style={{ width: 14, height: 14, accentColor: "var(--accent)" }} />
        <span className="font-mono uppercase"
              style={{ color: "var(--text)", fontSize: 11, letterSpacing: "0.14em" }}>
          {SIGNAL_LABELS[signal]}
        </span>
        <span style={{ color: "var(--muted-soft)", fontSize: 12 }}>· {SIGNAL_HINTS[signal]}</span>
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
                aria-label={`remover ${label}`}
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
