/**
 * Theme toggle — cycles auto → light → dark → auto, persisting the user's
 * choice in localStorage["dp-theme"].  Mirrors the Rails portal toggle so
 * the two views share the same UX.
 *
 * Pre-paint bootstrap lives in `index.html` and applies the `dark` class
 * before React mounts, so no FOUC.  This component handles user-driven
 * changes and live OS updates after mount.
 */
import { useEffect, useState } from "react";

import { useT } from "@/i18n/I18nProvider";

type Mode = "auto" | "light" | "dark";

function readSaved(): Mode {
  try {
    const v = localStorage.getItem("dp-theme");
    if (v === "light" || v === "dark") return v;
  } catch (_) {}
  return "auto";
}

function prefersDark(): boolean {
  return typeof window !== "undefined"
    && !!window.matchMedia
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyMode(mode: Mode): void {
  const root = document.documentElement;
  const wantsDark = mode === "dark" || (mode === "auto" && prefersDark());
  root.classList.toggle("dark", wantsDark);
  if (mode === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

export function ThemeToggle() {
  const t = useT();
  const [mode, setMode] = useState<Mode>(readSaved);

  // Keep the icon (which depends on system pref in auto mode) live-updating
  // when the user flips the OS theme.
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setSystemDark(mq.matches);
      // re-resolve in case we're in auto mode
      applyMode(readSaved());
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  function cycle() {
    const next: Mode = mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";
    setMode(next);
    try {
      if (next === "auto") localStorage.removeItem("dp-theme");
      else localStorage.setItem("dp-theme", next);
    } catch (_) {}
    applyMode(next);
  }

  // Icon reflects the effectively-rendered theme.
  const effectiveDark = mode === "dark" || (mode === "auto" && systemDark);
  const icon = effectiveDark ? "☾" : "☀︎";
  const label = t(`theme.${mode}`);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t("theme.aria")}
      title={t("theme.aria")}
      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
