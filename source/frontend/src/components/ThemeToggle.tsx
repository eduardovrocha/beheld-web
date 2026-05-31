/**
 * Theme toggle — cycles auto → light → dark → auto, persisting the user's
 * choice in localStorage["dp-theme"]. Display matches the mock: a minimal
 * text-only button reading "— dark" / "+ light" / "· auto".
 *
 * Pre-paint bootstrap lives in `index.html` and applies the `dark` class
 * before React mounts, so no FOUC.
 */
import { useEffect, useState } from "react";

import { useT } from "@/i18n/I18nProvider";

type Mode = "auto" | "light" | "dark" | "github";

function readSaved(): Mode {
  try {
    const v = localStorage.getItem("dp-theme");
    if (v === "light" || v === "dark" || v === "github") return v;
  } catch (_) {}
  return "auto";
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyMode(mode: Mode): void {
  const root = document.documentElement;
  const wantsDark = mode === "dark" || (mode === "auto" && prefersDark());
  root.classList.toggle("dark", wantsDark);
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

export function ThemeToggle() {
  const t = useT();
  const [mode, setMode] = useState<Mode>(readSaved);
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setSystemDark(mq.matches);
      applyMode(readSaved());
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  function cycle() {
    const next: Mode =
      mode === "auto" ? "light" :
      mode === "light" ? "dark" :
      mode === "dark" ? "github" :
      "auto";
    setMode(next);
    try {
      if (next === "auto") localStorage.removeItem("dp-theme");
      else localStorage.setItem("dp-theme", next);
    } catch (_) {}
    applyMode(next);
  }

  const effectiveDark = mode === "dark" || (mode === "auto" && systemDark);
  const prefix =
    mode === "auto"   ? "·" :
    mode === "github" ? "★" :
    effectiveDark     ? "—" :
                        "+";
  const label =
    mode === "auto"   ? t("theme.auto") :
    mode === "github" ? "github" :
    effectiveDark     ? "dark" :
                        "light";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t("theme.aria")}
      title={t("theme.aria")}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--muted)",
        padding: 0,
        transition: "color 150ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
    >
      {prefix} {label}
    </button>
  );
}
