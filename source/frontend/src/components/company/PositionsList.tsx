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
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import type {
  Position, PositionSections, PositionSectionKey, PositionInput,
  PositionSignal, PositionThreshold, PositionMatchesPayload, PositionMatchRow,
} from "@/lib/companyDashboardApi";
import { getPositionMatches, recalculatePositionMatches } from "@/lib/companyDashboardApi";
import {
  parseFromFile,
  SECTION_KEYS,
  SECTION_LABELS,
  SECTION_HINTS,
  type Sections,
} from "@/lib/positionMarkdownParser";
import { extractTechnologies } from "@/lib/positionTechExtractor";

type Mode =
  | { kind: "empty" }
  | { kind: "new"  }
  | { kind: "view"; id: number }
  | { kind: "edit"; id: number };

type CreateInput = PositionInput;
type UpdateInput = Partial<PositionInput>;

export function PositionsList({ positions, onCreate, onUpdate, onArchive, onReactivate }: {
  positions:    Position[];
  onCreate:     (input: CreateInput) => Promise<void> | void;
  onUpdate:     (id: number, input: UpdateInput) => Promise<void> | void;
  onArchive:    (id: number) => Promise<void> | void;
  onReactivate: (id: number) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "empty" });

  // When the position list reshapes (initial load, archive, new), keep the
  // current selection valid. Falling back to the first active row mirrors
  // common master/detail behavior (a vazio screen only when truly nothing).
  // Keep the right-column selection in sync with the list. Two cases:
  //   - view/edit on a position that just got archived/removed → fall back
  //     to the first active row (or "empty" if the list is gone).
  //   - sitting on "empty" while the list has items (e.g. just after a
  //     successful create) → auto-select the freshest row.
  // We include `mode` in the deps so the auto-select also fires when the
  // form transitions back to "empty" after submit; the inner guard stops
  // any loop.
  useEffect(() => {
    if (mode.kind === "view" || mode.kind === "edit") {
      const stillThere = positions.some((p) => p.id === mode.id);
      if (!stillThere) {
        const first = positions.find((p) => !p.archived) ?? positions[0];
        setMode(first ? { kind: "view", id: first.id } : { kind: "empty" });
      }
    } else if (mode.kind === "empty" && positions.length > 0) {
      const first = positions.find((p) => !p.archived) ?? positions[0];
      setMode({ kind: "view", id: first.id });
    }
  }, [positions, mode]);

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
            posições
          </span>
          <button type="button"
                  onClick={() => setMode({ kind: "new" })}
                  style={primaryChip(mode.kind === "new")}>
            + nova
          </button>
        </div>
        {positions.length === 0 ? (
          <p style={{ color: "var(--muted-soft)", fontSize: 12.5, lineHeight: 1.6, padding: "20px 16px" }}>
            Nenhuma posição ainda. Use <strong style={{ color: "var(--muted)" }}>+ nova</strong> para começar.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {positions.map((p) => {
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
                      {p.location || <span style={{ color: "var(--muted-soft)" }}>sem localização</span>}
                      {p.archived && (
                        <span className="font-mono uppercase"
                              style={{
                                marginLeft: "auto", padding: "1px 6px",
                                fontSize: 8, letterSpacing: "0.12em",
                                background: "var(--rule-soft)", color: "var(--muted)",
                                border: "1px solid var(--rule)",
                              }}>
                          arquivada
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
          <EmptyPanel onNew={() => setMode({ kind: "new" })} />
        )}

        {mode.kind === "new" && (
          <NewForm onCreate={async (input) => {
            await onCreate(input);
            // After create we leave the user on "empty" — the hook's
            // useEffect picks the freshly inserted row as soon as
            // `positions` updates.
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
                             if (!confirm("Arquivar esta posição? Mensagens passadas continuam visíveis.")) return;
                             await onArchive(selected.id);
                           }}
                           onReactivate={() => onReactivate(selected.id)} />
        )}
      </section>
    </div>
  );
}

// ── detail panels ───────────────────────────────────────────────────────────

function EmptyPanel({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ padding: 28 }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        nenhuma vaga selecionada
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
        Selecione uma vaga na coluna à esquerda para ver os detalhes, ou cadastre uma nova.
      </p>
      <div style={{ marginTop: 20 }}>
        <button type="button" onClick={onNew} style={primaryBtn(false)}>+ Nova posição</button>
      </div>
    </div>
  );
}

function DetailPanel({ position, onEdit, onArchive, onReactivate }: {
  position:     Position;
  onEdit:       () => void;
  onArchive:    () => void;
  onReactivate: () => void | Promise<void>;
}) {
  return (
    <div style={{ padding: 28, opacity: position.archived ? 0.7 : 1 }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        vaga
        <PositionStatusChip status={position.status} expiresAt={position.expires_at} />
      </div>

      <h3 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 22, letterSpacing: "-0.02em", marginTop: 8, lineHeight: 1.25 }}>
        {position.title}
      </h3>

      {position.location && (
        <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
          {position.location}
        </div>
      )}

      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 8,
                     letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        criada {formatDate(position.created_at)}
        {position.archived_at && <> · arquivada {formatDate(position.archived_at)}</>}
      </div>

      {position.technologies && position.technologies.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="font-mono uppercase"
               style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
            tecnologias
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

      <PositionActions position={position} onEdit={onEdit} onArchive={onArchive} onReactivate={onReactivate} />
    </div>
  );
}

// Action row keyed off `status`. Active positions can be edited/archived;
// expired positions surface a primary "Reativar" + secondary modify/encerrar
// (mirrors spec section 6 — "Opções: Reativar · Modificar thresholds · Encerrar").
function PositionActions({ position, onEdit, onArchive, onReactivate }: {
  position:     Position;
  onEdit:       () => void;
  onArchive:    () => void;
  onReactivate: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  if (position.status === "closed") return null;

  async function handleReactivate() {
    setBusy(true);
    try { await onReactivate(); } finally { setBusy(false); }
  }

  if (position.status === "expired") {
    return (
      <div style={{
        marginTop: 24, padding: 14,
        background: "rgba(181,97,53,0.08)",
        border: "1px solid rgba(181,97,53,0.35)",
      }}>
        <div className="font-mono uppercase"
             style={{ color: "var(--warn)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
          posição expirada
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>
          A janela de 30 dias terminou. Revise os matches + near-miss atualizados acima
          e decida o próximo passo.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleReactivate} disabled={busy} style={primaryBtn(busy)}>
            {busy ? "Reativando…" : "Reativar (+ 30 dias)"}
          </button>
          <button type="button" onClick={onEdit}    disabled={busy} style={secondaryBtn(busy)}>Modificar critérios</button>
          <button type="button" onClick={onArchive} disabled={busy} style={dangerBtn(busy)}>Encerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
      <button type="button" onClick={onEdit}    style={secondaryBtn(false)}>Editar</button>
      <button type="button" onClick={onArchive} style={dangerBtn(false)}>Arquivar</button>
    </div>
  );
}

// ── forms ──────────────────────────────────────────────────────────────────

function NewForm({ onCreate, onCancel }: {
  onCreate: (input: CreateInput) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [title,        setTitle]        = useState("");
  const [location,     setLocation]     = useState("");
  const [sections,     setSections]     = useState<Sections>({});
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [importNote,   setImportNote]   = useState<string | null>(null);
  const [criteria,     setCriteria]     = useState<MatchCriteria>(initialCriteria());
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    setBusy(true);
    setError(null);
    try {
      const { thresholds, priorities } = buildCriteriaPayload(criteria);
      await onCreate({
        title:        title.trim(),
        location:     location.trim() || undefined,
        technologies: technologies.length > 0 ? technologies : undefined,
        sections:     sanitizeSections(sections),
        thresholds,
        priorities,
      });
    } catch (e2) {
      setError((e2 as Error).message || "Falha ao criar posição.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 28 }} className="grid gap-4">
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        nova posição
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <SectionsImport
        disabled={busy}
        note={importNote}
        onImport={(r) => {
          setSections((prev) => ({ ...prev, ...r.sections }));
          // Tech extraction prefers the technical_stack section if matched;
          // otherwise scans the entire raw markdown so we still get hints.
          const seed = r.sections.technical_stack ?? r.raw;
          const extracted = extractTechnologies(seed).technologies;
          setTechnologies((prev) => uniqueOrdered([...prev, ...extracted]));
          setImportNote(formatImportNote(r.matched.length, extracted.length, r.unmatched));
        }}
        onError={(msg) => setImportNote(msg)} />

      <Field label="Título" hint="obrigatório">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
               required disabled={busy} placeholder="Engenheiro Backend Sênior"
               autoFocus style={inputStyle()} />
      </Field>

      <Field label="Localização" hint="opcional">
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
               disabled={busy} placeholder="Remoto, São Paulo, etc." style={inputStyle()} />
      </Field>

      <SectionFields disabled={busy} sections={sections} onChange={setSections} />

      <TechEditor label="Tecnologias" disabled={busy}
                  techs={technologies} onChange={setTechnologies}
                  source={(sections.technical_stack ?? "") + "\n" + (sections.requirements ?? "")} />

      <MatchCriteriaEditor disabled={busy} value={criteria} onChange={setCriteria}
                           techSuggestions={technologies} />

      <div className="flex gap-2 justify-end" style={{ marginTop: 4 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={secondaryBtn(busy)}>Cancelar</button>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>
          {busy ? "Cadastrando…" : "Cadastrar posição"}
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
  const [title,        setTitle]        = useState(position.title);
  const [location,     setLocation]     = useState(position.location ?? "");
  const [sections,     setSections]     = useState<Sections>(position.sections ?? {});
  const [technologies, setTechnologies] = useState<string[]>(position.technologies ?? []);
  const [importNote,   setImportNote]   = useState<string | null>(null);
  const [criteria,     setCriteria]     = useState<MatchCriteria>(criteriaFromPosition(position));
  const [busy,         setBusy]         = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { thresholds, priorities } = buildCriteriaPayload(criteria);
      await onSave({
        title:        title.trim(),
        location:     location.trim(),
        technologies,
        sections:     sanitizeSections(sections),
        thresholds,
        priorities,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 28 }} className="grid gap-4">
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        editar vaga
      </div>

      <SectionsImport
        disabled={busy}
        note={importNote}
        onImport={(r) => {
          setSections((prev) => ({ ...prev, ...r.sections }));
          const seed = r.sections.technical_stack ?? r.raw;
          const extracted = extractTechnologies(seed).technologies;
          setTechnologies((prev) => uniqueOrdered([...prev, ...extracted]));
          setImportNote(formatImportNote(r.matched.length, extracted.length, r.unmatched));
        }}
        onError={(msg) => setImportNote(msg)} />

      <Field label="Título">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
               required disabled={busy} autoFocus style={inputStyle()} />
      </Field>
      <Field label="Localização">
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
               disabled={busy} style={inputStyle()} />
      </Field>

      <SectionFields disabled={busy} sections={sections} onChange={setSections} />

      <TechEditor label="Tecnologias" disabled={busy}
                  techs={technologies} onChange={setTechnologies}
                  source={(sections.technical_stack ?? "") + "\n" + (sections.requirements ?? "")} />

      <MatchCriteriaEditor disabled={busy} value={criteria} onChange={setCriteria}
                           techSuggestions={technologies} />

      <div className="flex gap-2 justify-end" style={{ marginTop: 4 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={secondaryBtn(busy)}>Cancelar</button>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>
          {busy ? "Salvando…" : "Salvar"}
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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

// ── markdown import widget ─────────────────────────────────────────────────
//
// Reads a .md file, runs the section parser, and hands the structured
// result back to the form (which slots each section into its dedicated
// textarea + seeds the tech list from the technical_stack section).

function SectionsImport({ disabled, note, onImport, onError }: {
  disabled: boolean;
  note:     string | null;
  onImport: (r: { raw: string; sections: Sections; matched: PositionSectionKey[]; unmatched: string[]; matchCount: number }) => void;
  onError:  (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (file.size > 256_000) {
      onError("Arquivo grande demais (limite 256 KB).");
      return;
    }
    try {
      const parsed = await parseFromFile(file);
      onImport({
        raw:        parsed.raw,
        sections:   parsed.sections,
        matched:    parsed.matched as PositionSectionKey[],
        unmatched:  parsed.unmatched,
        matchCount: parsed.matched.length,
      });
    } catch (e) {
      onError(`Falha ao ler arquivo: ${(e as Error).message}`);
    }
  }

  return (
    <div style={{
      padding: 14,
      background: "var(--surface)",
      border: "1px dashed var(--rule)",
    }}>
      <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: note ? 8 : 0 }}>
        <span className="font-mono uppercase"
              style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
          importar descrição (.md)
        </span>
        <input ref={fileRef} type="file" accept=".md,text/markdown,text/plain"
               disabled={disabled}
               onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
               style={{ display: "none" }} />
        <button type="button"
                disabled={disabled}
                onClick={() => fileRef.current?.click()}
                style={secondaryBtn(disabled)}>
          Escolher arquivo
        </button>
        <span style={{ color: "var(--muted-soft)", fontSize: 12 }}>
          identifica Responsabilidades · Stack · Requirements · Qualifications · Nice to Have
        </span>
      </div>
      {note && (
        <div style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.5 }}>{note}</div>
      )}
    </div>
  );
}

function formatImportNote(matchedCount: number, techCount: number, unmatched: string[]): string {
  const parts: string[] = [];
  parts.push(
    matchedCount === 0
      ? "Nenhuma seção reconhecida — preencha manualmente."
      : `${matchedCount} ${matchedCount === 1 ? "seção identificada" : "seções identificadas"}.`,
  );
  if (techCount > 0) parts.push(`${techCount} tecnologias detectadas.`);
  if (unmatched.length > 0) {
    parts.push(`Não reconhecido: ${unmatched.slice(0, 3).join(", ")}${unmatched.length > 3 ? "…" : ""}`);
  }
  return parts.join(" ");
}

// ── 5 textareas, one per canonical section ────────────────────────────────

function SectionFields({ disabled, sections, onChange }: {
  disabled: boolean;
  sections: Sections;
  onChange: (next: Sections) => void;
}) {
  function set(key: PositionSectionKey, value: string) {
    onChange({ ...sections, [key]: value });
  }
  return (
    <>
      {(SECTION_KEYS as readonly PositionSectionKey[]).map((key) => (
        <Field key={key} label={SECTION_LABELS[key]} hint={SECTION_HINTS[key]}>
          <textarea
            value={sections[key] ?? ""}
            onChange={(e) => set(key, e.target.value)}
            disabled={disabled}
            rows={key === "responsibilities" || key === "qualifications" ? 5 : 4}
            placeholder={placeholderFor(key)}
            style={textareaStyle()} />
        </Field>
      ))}
    </>
  );
}

function placeholderFor(key: PositionSectionKey): string {
  switch (key) {
    case "responsibilities": return "• participar do design e implementação de…";
    case "technical_stack":  return "• Ruby on Rails, PostgreSQL, Sidekiq…";
    case "requirements":     return "• 3+ anos com…";
    case "qualifications":   return "• experiência prévia em produto B2B…";
    case "nice_to_have":     return "• contribuição em projetos open source…";
  }
}

// Strip empty / whitespace-only strings before sending to the backend so the
// server gets `{}` for fully blank forms instead of `{key: ""}` noise.
function sanitizeSections(s: Sections): PositionSections {
  const out: PositionSections = {};
  for (const key of SECTION_KEYS as readonly PositionSectionKey[]) {
    const v = (s[key] ?? "").trim();
    if (v) out[key] = v;
  }
  return out;
}

// Read-only render used by the detail panel. Falls back to the legacy
// `description` field when the position has no structured sections.
function SectionsView({ sections, fallback }: { sections?: Sections; fallback?: string | null }) {
  const filled = (SECTION_KEYS as readonly PositionSectionKey[])
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
        Sem descrição. Use "Editar" para adicionar detalhes da vaga.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {filled.map((key) => (
        <div key={key}>
          <div className="font-mono uppercase"
               style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em", marginBottom: 8 }}>
            {SECTION_LABELS[key]}
          </div>
          <p style={{
            color: "var(--text)", fontSize: 14.5, lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
          }}>
            {sections?.[key]}
          </p>
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
        <div className="grid gap-5">
          <MatchListBlock kind="match"     rows={data.matches} />
          <MatchListBlock kind="near_miss" rows={data.near_miss} />
        </div>
      )}
    </div>
  );
}

function MatchListBlock({ kind, rows }: { kind: "match" | "near_miss"; rows: PositionMatchRow[] }) {
  if (rows.length === 0) {
    return (
      <div>
        <BlockLabel kind={kind} count={0} />
        <p style={{ color: "var(--muted-soft)", fontSize: 13, lineHeight: 1.6 }}>
          {kind === "match"
            ? "Nenhum dev passou todos os thresholds hoje."
            : "Nenhum dev caiu dentro da margem de near-miss."}
        </p>
      </div>
    );
  }
  return (
    <div>
      <BlockLabel kind={kind} count={rows.length} />
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
        {rows.map((r, i) => <MatchRow key={r.account_id} row={r} first={i === 0} />)}
      </div>
    </div>
  );
}

function BlockLabel({ kind, count }: { kind: "match" | "near_miss"; count: number }) {
  const label = kind === "match" ? "Match confirmado" : "Near-miss";
  const tail  = kind === "match" ? "passaram todos os thresholds" : "1 threshold dentro da margem";
  return (
    <div className="mb-2 flex items-baseline gap-3">
      <span className="font-mono uppercase"
            style={{ color: kind === "match" ? "var(--ok)" : "var(--warn)",
                      fontSize: 11, letterSpacing: "0.16em" }}>
        {label} · {count}
      </span>
      <span style={{ color: "var(--muted-soft)", fontSize: 12 }}>· {tail}</span>
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
        <a href={`/v/${row.bundle_slug}`}
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
  if (!curve || curve.status === "unsupported" || curve.status === "none") return null;
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
  const palette = status === "active"
    ? { bg: "rgba(74,124,78,0.12)", fg: "var(--ok)",   bd: "rgba(74,124,78,0.4)" }
    : status === "expired"
    ? { bg: "rgba(181,97,53,0.12)", fg: "var(--warn)", bd: "rgba(181,97,53,0.4)" }
    : { bg: "var(--rule-soft)",     fg: "var(--muted)", bd: "var(--rule)" };
  const label = status === "active" ? "ativa" : status === "expired" ? "expirada" : "encerrada";
  return (
    <span style={{
      marginLeft: 8, padding: "2px 8px",
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.bd}`,
      fontSize: 9, letterSpacing: "0.14em",
    }}>
      {label}
      {status === "active" && expiresAt && (
        <span style={{ marginLeft: 6, opacity: 0.8, fontFeatureSettings: '"tnum"' }}>
          · expira {formatDate(expiresAt)}
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

function MatchCriteriaEditor({ disabled, value, onChange, techSuggestions }: {
  disabled:       boolean;
  value:          MatchCriteria;
  onChange:       (next: MatchCriteria) => void;
  techSuggestions: string[];  // technologies are a useful seed for ecosystems
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

  function move(signal: PositionSignal, dir: -1 | 1) {
    const order = [...value.priorityOrder];
    const i = order.indexOf(signal);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    onChange({ ...value, priorityOrder: order });
  }

  const weightFor = (rank: number) => [0.40, 0.30, 0.20, 0.10][rank - 1] ?? 0;

  return (
    <Field label="Critérios de match" hint="thresholds que o dev precisa atender + ordem de prioridade">
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        padding: 14, display: "grid", gap: 14,
      }}>
        {/* ecosystems */}
        <SignalRow
          signal="ecosystems"
          enabled={value.ecosystems.enabled}
          disabled={disabled}
          onToggle={(v) => setSignal("ecosystems", { enabled: v })}
        >
          <ChipsInput
            disabled={disabled || !value.ecosystems.enabled}
            value={value.ecosystems.items}
            suggestions={techSuggestions}
            onChange={(items) => setSignal("ecosystems", { items })}
            placeholder="ex: React, Rails, AWS…" />
        </SignalRow>

        {/* test_ratio */}
        <SignalRow
          signal="test_ratio"
          enabled={value.test_ratio.enabled}
          disabled={disabled}
          onToggle={(v) => setSignal("test_ratio", { enabled: v })}
        >
          <NumberInput
            disabled={disabled || !value.test_ratio.enabled}
            value={value.test_ratio.min}
            min={0} max={100} step={1} suffix="% mínimo"
            onChange={(n) => setSignal("test_ratio", { min: n })} />
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
        </SignalRow>

        {/* priorities */}
        {value.priorityOrder.length > 0 && (
          <div style={{ paddingTop: 8, borderTop: "1px dashed var(--rule)" }}>
            <div className="font-mono uppercase"
                 style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
              prioridade — arraste com ↑ ↓ para reordenar
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
              {value.priorityOrder.map((signal, idx) => (
                <li key={signal} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto auto",
                  alignItems: "center", gap: 8,
                  padding: "6px 10px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--rule)",
                }}>
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
                  <span className="flex gap-1">
                    <button type="button" disabled={disabled || idx === 0}
                            onClick={() => move(signal, -1)} style={miniBtn(disabled || idx === 0)}
                            aria-label="mover para cima">↑</button>
                    <button type="button" disabled={disabled || idx === value.priorityOrder.length - 1}
                            onClick={() => move(signal, +1)} style={miniBtn(disabled || idx === value.priorityOrder.length - 1)}
                            aria-label="mover para baixo">↓</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
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

function ChipsInput({ disabled, value, suggestions, onChange, placeholder }: {
  disabled:    boolean;
  value:       string[];
  suggestions: string[];
  onChange:    (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const visibleSuggestions = suggestions.filter((s) =>
    !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  ).slice(0, 8);

  function add(raw: string) {
    const v = raw.trim();
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    onChange([...value, v]);
    setDraft("");
  }

  return (
    <div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        padding: "6px 8px", minHeight: 36,
        background: disabled ? "var(--surface-2)" : "var(--bg)",
        border: "1px solid var(--rule)",
        opacity: disabled ? 0.5 : 1,
      }}>
        {value.map((t) => (
          <TechChip key={t} label={t} onRemove={disabled ? undefined : () => onChange(value.filter((x) => x !== t))} />
        ))}
        <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
               disabled={disabled}
               onKeyDown={(e) => {
                 if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
                 else if (e.key === "Backspace" && draft === "" && value.length > 0) onChange(value.slice(0, -1));
               }}
               onBlur={() => draft && add(draft)}
               placeholder={value.length === 0 ? placeholder : ""}
               style={{
                 flex: "1 1 120px", minWidth: 100,
                 font: "inherit", fontSize: 13,
                 background: "transparent", border: "none", outline: "none",
                 color: "var(--text)", padding: "2px 4px",
               }} />
      </div>
      {!disabled && visibleSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center" style={{ gap: 6 }}>
          <span className="font-mono uppercase"
                style={{ color: "var(--muted-soft)", fontSize: 10, letterSpacing: "0.12em" }}>
            das tecnologias:
          </span>
          {visibleSuggestions.map((s) => (
            <button key={s} type="button" onClick={() => onChange([...value, s])}
                    style={{
                      font: "inherit", fontSize: 11.5,
                      padding: "2px 8px",
                      background: "transparent", color: "var(--accent)",
                      border: "1px dashed var(--accent)", borderRadius: 0, cursor: "pointer",
                    }}>+ {s}</button>
          ))}
        </div>
      )}
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

function miniBtn(disabled: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 12,
    width: 24, height: 24, lineHeight: 1,
    padding: 0,
    background: "transparent", color: "var(--text)",
    border: "1px solid var(--rule)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
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
