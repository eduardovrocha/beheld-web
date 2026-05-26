/**
 * Reusable "save dev" toggle for /v/:slug and /directory result cards.
 * Renders only when a recruiter session is active. The first POST creates
 * the bookmark; a Salvo state replaces the button (no UI for un-saving
 * here — the dashboard handles full management).
 */
import { useState, type CSSProperties } from "react";

import { saveDev as apiSaveDev, CompanyAuthError } from "@/lib/companyDashboardApi";

export function SaveDevButton({ accountId, alreadySaved, hidden, size = "md" }: {
  accountId:     number;
  alreadySaved?: boolean;
  hidden?:       boolean;     // explicit opt-out (e.g., recruiter not logged in)
  size?:         "sm" | "md";
}) {
  const [saved, setSaved]   = useState<boolean>(alreadySaved ?? false);
  const [busy,  setBusy]    = useState(false);
  const [error, setError]   = useState<string | null>(null);

  if (hidden) return null;

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await apiSaveDev(accountId, null);
      setSaved(true);
    } catch (e) {
      if (e instanceof CompanyAuthError) {
        // Surface as plain text — the parent route decides what to do
        // (Directory already redirects on its own 401, /v/:slug just
        // hides the button if not authed).
        setError("login necessário");
      } else {
        setError("falha ao salvar");
      }
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <span className="font-mono uppercase"
            style={chipStyle(size, { background: "rgba(74,124,78,0.12)", color: "var(--ok)",
                                      border: "1px solid rgba(74,124,78,0.4)" })}>
        salvo ✓
      </span>
    );
  }

  return (
    <button type="button" onClick={handleSave} disabled={busy}
            className="font-mono uppercase"
            style={chipStyle(size, {
              background:  "transparent",
              color:       "var(--text)",
              border:      "1px solid var(--rule)",
              cursor:      busy ? "not-allowed" : "pointer",
              opacity:     busy ? 0.5 : 1,
            })}
            title={error ?? undefined}>
      {busy ? "salvando…" : error ?? "+ salvar"}
    </button>
  );
}

function chipStyle(size: "sm" | "md", extra: CSSProperties): CSSProperties {
  const small = size === "sm";
  return {
    display: "inline-block",
    padding: small ? "2px 8px" : "4px 10px",
    fontSize: small ? 9 : 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    ...extra,
  };
}
