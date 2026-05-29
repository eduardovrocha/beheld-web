/**
 * Floating "voltar" chip pinned top-left of recruiter-facing routes
 * (/v/:slug, /accounts/:id/contact). Mirrors the chrome of the locale +
 * theme box rendered by Layout.tsx (fixed-position card with hairline,
 * JetBrains Mono uppercase label), but anchored to the left edge so it
 * reads as navigation rather than view settings.
 *
 * `to` defaults to /company/dashboard — the recruiter's "home" record —
 * but callers can override to wire a more natural back destination for
 * their flow (e.g. /directory from the contact form).
 *
 * With `back`, the chip returns to wherever the user came from (history -1)
 * — directory, messages, dashboard, etc. — falling back to `to` only when
 * there's no in-app history (page opened directly in a fresh tab).
 */
import { useNavigate } from "react-router-dom";

import { useT } from "@/i18n/I18nProvider";

export function FloatingBack({ to = "/company/dashboard", back = false }: { to?: string; back?: boolean }) {
  const navigate = useNavigate();
  const t = useT();

  function handleBack() {
    if (back) {
      // react-router stamps a monotonic `idx` on history.state; > 0 means
      // there's a previous in-app entry we can safely pop back to.
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) { navigate(-1); return; }
    }
    navigate(to);
  }

  return (
    <div className="fixed z-50 flex items-center"
         style={{
           top: 20, left: 20,
           background: "var(--bg)",
           border: "1px solid var(--rule)",
           padding: "7px 14px",
         }}>
      <button
        type="button"
        onClick={handleBack}
        aria-label={t("common.back")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted)",
          padding: 0,
          transition: "color 150ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
        ← {t("common.back")}
      </button>
    </div>
  );
}
