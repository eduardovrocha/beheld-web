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
 */
import { useNavigate } from "react-router-dom";

export function FloatingBack({ to = "/company/dashboard" }: { to?: string }) {
  const navigate = useNavigate();
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
        onClick={() => navigate(to)}
        aria-label="voltar"
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
        ← voltar
      </button>
    </div>
  );
}
