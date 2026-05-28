/**
 * Bookmarked devs. The note is editable inline (no modal). Private to
 * the company — the API never surfaces these notes elsewhere.
 */
import { useState } from "react";
import { Link } from "react-router-dom";

import type { SavedDev } from "@/lib/companyDashboardApi";

const BUNDLE_STATUS_LABEL: Record<NonNullable<SavedDev["bundle_status"]>, string> = {
  verified: "verificado", outdated: "desatualizado", revoked: "revogado",
};

// Ícone por status do bundle — substitui o rótulo textual no chip. O texto
// continua acessível via title + aria-label.
const BUNDLE_STATUS_ICON: Record<NonNullable<SavedDev["bundle_status"]>, string> = {
  verified: "✓",   // verificado
  outdated: "◷",   // desatualizado
  revoked:  "✕",   // revogado
};

const BUNDLE_STATUS_PALETTE: Record<NonNullable<SavedDev["bundle_status"]>, { fg: string; bg: string; bd: string }> = {
  verified: { fg: "var(--ok)",    bg: "rgba(74,124,78,0.12)", bd: "rgba(74,124,78,0.4)" },
  outdated: { fg: "var(--warn)",  bg: "rgba(181,97,53,0.12)", bd: "rgba(181,97,53,0.4)" },
  revoked:  { fg: "var(--muted)", bg: "var(--rule-soft)",     bd: "var(--rule)" },
};

export function SavedDevsList({ savedDevs, onUpdateNote, onRemove }: {
  savedDevs:    SavedDev[];
  onUpdateNote: (accountId: number, note: string) => Promise<void> | void;
  onRemove:     (accountId: number)               => Promise<void> | void;
}) {
  if (savedDevs.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        Nenhum dev salvo ainda.
      </p>
    );
  }

  return (
    <div className="grid gap-4"
         style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {savedDevs.map((s) => (
        <SavedDevCard key={s.account_id} dev={s}
                      onUpdateNote={onUpdateNote} onRemove={onRemove} />
      ))}
    </div>
  );
}

function SavedDevCard({ dev, onUpdateNote, onRemove }: {
  dev: SavedDev;
  onUpdateNote: (accountId: number, note: string) => Promise<void> | void;
  onRemove:     (accountId: number)               => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(dev.note ?? "");
  const [busy,    setBusy]    = useState(false);

  async function save() {
    setBusy(true);
    try { await onUpdateNote(dev.account_id, draft); setEditing(false); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm("Remover este dev da sua lista? A nota será apagada.")) return;
    setBusy(true);
    try { await onRemove(dev.account_id); } finally { setBusy(false); }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--card-bg)", border: "1px solid var(--rule)",
      padding: 18, minHeight: 196,
    }}>
      {/* header: handle + status */}
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        {dev.bundle_slug
          ? <a href={`/v/${dev.bundle_slug}`} target="_blank" rel="noopener noreferrer"
               style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em",
                        textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3 }}>
              {dev.dev_handle}
            </a>
          : <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {dev.dev_handle}
            </span>}
        {dev.bundle_status && (
          <span title={BUNDLE_STATUS_LABEL[dev.bundle_status]}
                aria-label={BUNDLE_STATUS_LABEL[dev.bundle_status]}
                style={{
                  marginLeft: "auto",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 30, fontSize: 17, lineHeight: 1,
                  color: BUNDLE_STATUS_PALETTE[dev.bundle_status].fg,
                }}>
            {BUNDLE_STATUS_ICON[dev.bundle_status]}
          </span>
        )}
      </div>

      {/* nota: inline editável */}
      {editing ? (
        <div className="mt-3 grid gap-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                    rows={3} placeholder="nota privada — só você vê"
                    style={{
                      font: "inherit", fontSize: 13, padding: "8px 10px",
                      color: "var(--text)", background: "var(--bg)",
                      border: "1px solid var(--rule)", borderRadius: 0, outline: "none",
                      resize: "vertical",
                      fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif", lineHeight: 1.55,
                    }} />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy} style={primaryBtn(busy)}>Salvar nota</button>
            <button type="button" onClick={() => { setDraft(dev.note ?? ""); setEditing(false); }}
                    disabled={busy} style={secondaryBtn(busy)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p style={{ color: dev.note ? "var(--text)" : "var(--muted-soft)",
                       fontSize: 13.5, lineHeight: 1.55,
                       fontFamily: dev.note ? "'Newsreader', Georgia, serif" : "inherit",
                       fontStyle: dev.note ? "normal" : "italic" }}>
            {dev.note || "sem nota"}
          </p>
          <button type="button" onClick={() => setEditing(true)}
                  className="font-mono uppercase"
                  style={{
                    marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontSize: 10, letterSpacing: "0.14em", color: "var(--muted)",
                    textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
                  }}>
            editar nota
          </button>
        </div>
      )}

      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 8,
                     letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        salvo {formatDate(dev.saved_at)}
      </div>

      {/* ações ancoradas no rodapé */}
      <div className="mt-auto flex flex-wrap items-center pt-4" style={{ gap: 8 }}>
        <Link to={`/accounts/${dev.account_id}/contact`} style={primaryLinkStyle()}>
          enviar mensagem →
        </Link>
        <button type="button" onClick={remove} disabled={busy} style={dangerBtn(busy)}>
          remover
        </button>
      </div>
    </div>
  );
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 12.5,
    padding: "6px 14px",
    background: "var(--text)", color: "var(--bg)",
    border: "1px solid var(--text)",
    cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
  };
}
function secondaryBtn(busy: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 12.5,
    padding: "6px 14px",
    background: "transparent", color: "var(--text)",
    border: "1px solid var(--rule)",
    cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
  };
}
function dangerBtn(busy: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 12.5,
    padding: "6px 14px",
    background: "transparent", color: "var(--warn)",
    border: "1px solid color-mix(in srgb, var(--warn) 60%, var(--rule))",
    cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
  };
}
function primaryLinkStyle(): React.CSSProperties {
  return {
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
    color: "var(--bg)", background: "var(--text)",
    border: "1px solid var(--text)", padding: "6px 14px",
    textDecoration: "none", textAlign: "center",
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
