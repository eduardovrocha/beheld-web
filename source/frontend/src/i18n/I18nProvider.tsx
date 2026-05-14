/**
 * Tiny i18n provider — no external deps.  Tracks the active Locale in React
 * state, persists user choice in localStorage["dp-locale"], and exposes a
 * `t(key, params?)` function via context.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { DICTIONARIES, format, LOCALES, type Locale } from "./dict";

const STORAGE_KEY = "dp-locale";

function detectInitialLocale(): Locale {
  // 1. Explicit user choice persists across sessions.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
  } catch {
    /* private mode / disabled storage */
  }
  // 2. Best-effort match from the browser language list.
  if (typeof navigator !== "undefined") {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language ?? "pt"];
    for (const raw of langs) {
      const lang = (raw ?? "").toLowerCase();
      if (lang.startsWith("pt")) return "pt";
      if (lang.startsWith("en")) return "en";
      if (lang.startsWith("es")) return "es";
    }
  }
  // 3. Default — Portuguese (project's primary language).
  return "pt";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    // Update <html lang> so screen readers and crawlers see the right value.
    document.documentElement.setAttribute("lang", l === "pt" ? "pt-BR" : l);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => format(dict[key] ?? key, params),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function useT(): I18nContextValue["t"] {
  return useI18n().t;
}
