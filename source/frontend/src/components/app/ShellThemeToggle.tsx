/**
 * ShellThemeToggle — alterna o tema do app shell (design_handoff_temas).
 *
 * Dark é o default (sem atributo); o claro liga `data-theme-v2="light"`
 * no <html>. Atributo PRÓPRIO do shell: o legado das rotas temáticas usa
 * `data-theme="github"` (dp-theme) e os dois sistemas não podem disputar
 * o mesmo atributo. Persistência em localStorage["beheld:theme"],
 * aplicada pré-paint por um IIFE no index.html (sem flash dark→light).
 *
 * O ícone mostra o tema ATUAL (lua no dark, sol no light) — escolha via
 * CSS (`.theme-toggle .moon/.sun` em app-shell.css), não via re-render.
 */
import { useCallback, useState } from "react";

import { useT } from "@/i18n/I18nProvider";

const STORAGE_KEY = "beheld:theme";
const ATTR = "data-theme-v2";

export type ShellTheme = "dark" | "light";

export function useShellTheme(): { theme: ShellTheme; toggle: () => void } {
  const [theme, setTheme] = useState<ShellTheme>(() =>
    document.documentElement.getAttribute(ATTR) === "light" ? "light" : "dark",
  );

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: ShellTheme = prev === "light" ? "dark" : "light";
      if (next === "light") document.documentElement.setAttribute(ATTR, "light");
      else document.documentElement.removeAttribute(ATTR);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode — o tema vale só pra sessão */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}

export function ShellThemeToggle() {
  const t = useT();
  const { theme, toggle } = useShellTheme();
  return (
    <button className="theme-toggle" type="button" onClick={toggle}
            aria-label={t("shell.theme.toggle_aria")} aria-pressed={theme === "light"}>
      <svg className="moon" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M10 7.2a4 4 0 1 1-5.2-5.2 4 4 0 0 0 5.2 5.2z" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      <svg className="sun" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 .8v1.6M6 9.6v1.6M.8 6h1.6M9.6 6h1.6M2.3 2.3l1.1 1.1M8.6 8.6l1.1 1.1M2.3 9.7l1.1-1.1M8.6 3.4l1.1-1.1"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="label">{t("shell.theme.label")}</span>
    </button>
  );
}
