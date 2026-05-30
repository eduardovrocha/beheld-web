/**
 * Bookmarked devs. The note is editable inline (no modal). Private to
 * the company — the API never surfaces these notes elsewhere.
 */
import { useState } from "react";
import { Link } from "react-router-dom";

import type { SavedDev } from "@/lib/companyDashboardApi";
import { useT, useFmt } from "@/i18n/I18nProvider";

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
  const t = useT();
  if (savedDevs.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        {t("company.saved.empty")}
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
          <span title={t(`common.bundle_status.${dev.bundle_status}`)}
                aria-label={t(`common.bundle_status.${dev.bundle_status}`)}
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
                    rows={3} placeholder={t("company.saved.note_placeholder")}
                    style={{
                      font: "inherit", fontSize: 13, padding: "8px 10px",
                      color: "var(--text)", background: "var(--bg)",
                      border: "1px solid var(--rule)", borderRadius: 0, outline: "none",
                      resize: "vertical",
                      fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif", lineHeight: 1.55,
                    }} />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy} style={primaryBtn(busy)}>{t("company.saved.save_note")}</button>
            <button type="button" onClick={() => { setDraft(dev.note ?? ""); setEditing(false); }}
                    disabled={busy} style={secondaryBtn(busy)}>{t("common.cancel")}</button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p style={{ color: dev.note ? "var(--text)" : "var(--muted-soft)",
                       fontSize: 13.5, lineHeight: 1.55,
                       fontFamily: dev.note ? "'Newsreader', Georgia, serif" : "inherit",
                       fontStyle: dev.note ? "normal" : "italic" }}>
            {dev.note || t("company.saved.no_note")}
          </p>
          <button type="button" onClick={() => setEditing(true)}
                  className="font-mono uppercase"
                  style={{
                    marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontSize: 10, letterSpacing: "0.14em", color: "var(--muted)",
                    textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
                  }}>
            {t("company.saved.edit_note")}
          </button>
        </div>
      )}

      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 8,
                     letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        {t("company.saved.saved_at", { date: fmt.date(dev.saved_at) })}
      </div>

      {/* ações ancoradas no rodapé — link style igual ao CompanyNav */}
      <div className="mt-auto flex flex-wrap items-center font-mono pt-4"
           style={{ gap: 10, fontSize: 12, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
        <Link to={`/accounts/${dev.account_id}/contact`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6,
                       color: "var(--muted)", textDecoration: "none",
                       transition: "color 120ms ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
          <ContactIcon /> {t("company.saved.send_message")}
        </Link>
        <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
        <button type="button" onClick={remove} disabled={busy}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "none", border: "none", padding: 0,
                  font: "inherit", letterSpacing: "0.04em",
                  color: "var(--muted)",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.45 : 1,
                  transition: "color 120ms ease",
                }}
                onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = "var(--warn)"; }}
                onMouseLeave={(e) => { if (!busy) e.currentTarget.style.color = "var(--muted)"; }}>
          <RemoveIcon /> {t("company.saved.remove")}
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

// Inline 11px stroke icons — same size/idiom as CompanyNav so the action
// row reads as "Dashboard | Directory" style links rather than buttons.
function ContactIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <rect x="0.5" y="2" width="10" height="7" stroke="currentColor" />
      <path d="M0.5 2.5 L5.5 6 L10.5 2.5" stroke="currentColor" />
    </svg>
  );
}
function RemoveIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <line x1="2" y1="5.5" x2="9" y2="5.5" stroke="currentColor" />
    </svg>
  );
}

