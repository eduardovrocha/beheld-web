/**
 * Theme toggle — single button cycling dark ↔ github.
 *
 * - `dark`   → `html.dark` (DEFAULT, no `data-theme` attribute)
 * - `github` → `html[data-theme="github"]` (no `dark` class)
 *
 * The pre-paint script in `index.html` resolves the theme from
 * `localStorage["dp-theme"]` before React mounts (default: `dark`),
 * so there is no FOUC. We read the same key on mount and update
 * both the DOM and storage when the user clicks.
 *
 * The label legacy ("auto"/"light") seen in older versions is dropped;
 * those persisted values are migrated to "dark" by the pre-paint.
 *
 * Icon rule: shown icon = the *target* of clicking, not current state.
 *   · current dark   → show ☀ sun  (clicking will go light/github)
 *   · current github → show ☾ moon (clicking will go dark)
 */
import { useEffect, useState } from "react";

import { useT } from "@/i18n/I18nProvider";

type Mode = "dark" | "github";

const STORAGE_KEY = "dp-theme";

function readSaved(): Mode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "github") return "github";
  } catch (_) {}
  return "dark";
}

function applyMode(mode: Mode): void {
  const root = document.documentElement;
  if (mode === "github") {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "github");
  } else {
    root.classList.add("dark");
    root.removeAttribute("data-theme");
  }
  // Notify non-React listeners (e.g. constellation canvas) that the
  // theme — and therefore the resolved --accent — just changed.
  document.dispatchEvent(new CustomEvent("themechange", { detail: { mode } }));
}

export function ThemeToggle() {
  const t = useT();
  const [mode, setMode] = useState<Mode>(readSaved);

  // Keep React state in sync with the DOM on mount (pre-paint may have
  // applied a value localStorage didn't have yet, e.g. first visit).
  useEffect(() => {
    applyMode(mode);
    // intentional: run once with the resolved mode from readSaved
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cycle() {
    const next: Mode = mode === "dark" ? "github" : "dark";
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
    applyMode(next);
  }

  const aria = mode === "dark" ? t("theme.aria.toGithub") : t("theme.aria.toDark");

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={aria}
      title={aria}
      className="theme-toggle"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        borderRadius: 9,
        color: "var(--muted)",
        cursor: "pointer",
        transition: "color 180ms ease, border-color 180ms ease, background-color 300ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--muted)";
        e.currentTarget.style.borderColor = "var(--rule)";
      }}
    >
      {mode === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// ── Icons (inline; match the mockup's stroke style) ─────────────────────

function SunIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
