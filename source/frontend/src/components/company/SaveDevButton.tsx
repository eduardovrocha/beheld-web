/**
 * Reusable "save dev" toggle for /v/:slug and /directory result cards.
 * Renders only when a recruiter session is active. The first POST creates
 * the bookmark; a Salvo state replaces the button (no UI for un-saving
 * here — the dashboard handles full management).
 */
import { useState, type CSSProperties } from "react";

import { saveDev as apiSaveDev, CompanyAuthError } from "@/lib/companyDashboardApi";
import { useT } from "@/i18n/I18nProvider";

export function SaveDevButton({ accountId, alreadySaved, hidden, size = "md", label, variant = "chip" }: {
  accountId:     number;
  alreadySaved?: boolean;
  hidden?:       boolean;     // explicit opt-out (e.g., recruiter not logged in)
  size?:         "sm" | "md";
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
      <span style={chipStyle(size, { background: "rgba(74,124,78,0.12)", color: "var(--ok)",
                                      border: "1px solid rgba(74,124,78,0.4)" })}>
        {t("company.save_dev.saved")}
      </span>
    );
  }

  return (
    <button type="button" onClick={handleSave} disabled={busy}
            style={chipStyle(size, {
              background:  "transparent",
              color:       "var(--text)",
              border:      "1px solid var(--rule)",
              cursor:      busy ? "not-allowed" : "pointer",
              opacity:     busy ? 0.5 : 1,
            })}
            title={error ?? undefined}>
      {busy ? t("company.save_dev.saving") : error ?? cta}
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

// Matches the linkButtonStyle used by "Ver perfil →" and "Contatar" so the
// three controls in /directory cards (and the floating chip on /v/:slug)
// share one visual vocabulary — same font, height, padding, border weight.
function chipStyle(size: "sm" | "md", extra: CSSProperties): CSSProperties {
  const small = size === "sm";
  return {
    font:         "inherit",
    display:      "inline-block",
    padding:      small ? "5px 12px" : "6px 14px",
    fontSize:     small ? 12 : 12.5,
    letterSpacing: "0.02em",
    borderRadius: 0,
    whiteSpace:   "nowrap",
    ...extra,
  };
}
