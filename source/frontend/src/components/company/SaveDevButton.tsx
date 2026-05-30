/**
 * Reusable "save dev" toggle for /v/:slug and /directory result cards.
 * Renders only when a recruiter session is active. The first POST creates
 * the bookmark; a Salvo state replaces the button (no UI for un-saving
 * here — the dashboard handles full management).
 */
import { useState, type CSSProperties } from "react";

import { saveDev as apiSaveDev, CompanyAuthError } from "@/lib/companyDashboardApi";
import { useT } from "@/i18n/I18nProvider";

export function SaveDevButton({ accountId, alreadySaved, hidden, label, variant = "chip" }: {
  accountId:     number;
  alreadySaved?: boolean;
  hidden?:       boolean;     // explicit opt-out (e.g., recruiter not logged in)
  label?:        string;      // copy customizável; default = company.save_dev.cta
  variant?:      "chip" | "mono"; // "mono" matches the JetBrains Mono / uppercase chrome of FloatingBack
}) {
  const t = useT();
  const [saved, setSaved]   = useState<boolean>(alreadySaved ?? false);
  const [busy,  setBusy]    = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const cta = label ?? t("company.save_dev.cta");

  if (hidden) return null;

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await apiSaveDev(accountId, null);
      setSaved(true);
    } catch (e) {
      // Surface as plain text — the parent route decides what to do.
      setError(e instanceof CompanyAuthError
        ? t("company.save_dev.login_required")
        : t("company.save_dev.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (variant === "mono") {
    return (
      <MonoSaveButton saved={saved} busy={busy} error={error} label={cta} onSave={handleSave} />
    );
  }

  if (saved) {
    return (
      <span style={linkBase("var(--ok)")}>
        <CheckIcon /> {t("company.save_dev.saved")}
      </span>
    );
  }

  return (
    <button type="button" onClick={handleSave} disabled={busy}
            style={{ ...linkBase("var(--muted)"),
                     cursor: busy ? "not-allowed" : "pointer",
                     opacity: busy ? 0.5 : 1,
                     transition: "color 120ms ease" }}
            onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { if (!busy) e.currentTarget.style.color = "var(--muted)"; }}
            title={error ?? undefined}>
      <PlusIcon /> {busy ? t("company.save_dev.saving") : error ?? cta}
    </button>
  );
}

// Mirror of FloatingBack's "← voltar" chrome: JetBrains Mono, 10px uppercase,
// muted → accent on hover, no border (the outer FloatingSaveDev box owns it).
function MonoSaveButton({ saved, busy, error, label, onSave }: {
  saved: boolean; busy: boolean; error: string | null; label: string;
  onSave: () => Promise<void> | void;
}) {
  const t = useT();
  if (saved) {
    return (
      <span style={{ ...monoBase(), color: "var(--ok)" }}>
        {t("company.save_dev.saved_mono")}
      </span>
    );
  }
  return (
    <button type="button" onClick={() => void onSave()} disabled={busy}
            title={error ?? undefined}
            style={{ ...monoBase(), color: "var(--muted)", cursor: busy ? "not-allowed" : "pointer",
                     opacity: busy ? 0.5 : 1, transition: "color 150ms ease" }}
            onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { if (!busy) e.currentTarget.style.color = "var(--muted)"; }}>
      {busy ? t("company.save_dev.saving_mono") : error ?? label}
    </button>
  );
}

function monoBase(): CSSProperties {
  return {
    background:    "none",
    border:        "none",
    padding:       0,
    fontFamily:    "'JetBrains Mono', ui-monospace, monospace",
    fontSize:      10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  };
}

// Link-style chrome shared by Salvar / Salvo — mirrors the CompanyNav
// "Dashboard | Directory" idiom: inline-flex, font-mono 12px, muted by
// default, no border or fill. Color is parameterized so the "saved" state
// reads in ok-green.
function linkBase(color: string): CSSProperties {
  return {
    display:       "inline-flex",
    alignItems:    "center",
    gap:           6,
    background:    "none",
    border:        "none",
    padding:       0,
    fontFamily:    "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize:      12,
    letterSpacing: "0.04em",
    color,
    whiteSpace:    "nowrap",
  };
}

// Plus glyph — adopts the dev (save action).
function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <line x1="5.5" y1="2" x2="5.5" y2="9" stroke="currentColor" />
      <line x1="2"   y1="5.5" x2="9" y2="5.5" stroke="currentColor" />
    </svg>
  );
}

// Check glyph — confirmation that the dev is saved.
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <path d="M2 6 L4.5 8.5 L9 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
