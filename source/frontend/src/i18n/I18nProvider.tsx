/**
 * Provider i18n — sem deps externas. Mantém o Locale ativo em estado React,
 * persiste a escolha em localStorage["dp-locale"], detecta o idioma do
 * navegador e expõe via contexto:
 *   t(key, params?)            — tradução + interpolação {placeholder}
 *   tp(key, count, params?)    — pluralização (Intl.PluralRules)
 *   fmt                        — formatadores Intl (número/moeda/%/data/hora)
 *
 * es é carregado sob demanda (code-split); pt-BR/en vêm no bundle (padrão +
 * fallback). Fallback de chave: ativo → pt-BR → en → própria chave.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  loadedDict, loadLocale, resolve, format, pluralize,
  LOCALES, type Dict, type Locale, type Translatable,
} from "./dict";
import { createFormatters, type Formatters } from "./format";

const STORAGE_KEY = "dp-locale";

function htmlLang(l: Locale): string {
  return l === "pt" ? "pt-BR" : l;
}

function detectInitialLocale(): Locale {
  // 1. Escolha explícita do usuário persiste entre sessões.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
  } catch {
    /* private mode / storage desabilitado */
  }
  // 2. Melhor correspondência com a lista de idiomas do navegador.
  if (typeof navigator !== "undefined") {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language ?? "pt"];
    for (const raw of langs) {
      const lang = (raw ?? "").toLowerCase();
      if (lang.startsWith("pt")) return "pt";
      if (lang.startsWith("en")) return "en";
      if (lang.startsWith("es")) return "es";
    }
  }
  // 3. Padrão — Português (idioma primário do projeto).
  return "pt";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: Translatable, params?: Record<string, string | number>) => string;
  tp: (key: Translatable, count: number, params?: Record<string, string | number>) => string;
  fmt: Formatters;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);
  const [dict, setDict] = useState<Dict>(() => loadedDict(locale));

  // Carrega o dicionário do locale ativo (es é assíncrono) e mantém <html lang>.
  useEffect(() => {
    let cancelled = false;
    setDict(loadedDict(locale)); // imediato (cai no fallback pt enquanto es não chega)
    loadLocale(locale).then((d) => { if (!cancelled) setDict(d); }).catch(() => {});
    document.documentElement.setAttribute("lang", htmlLang(locale));
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, params) => format(resolve(dict, key as string), params),
    tp: (key, count, params) => pluralize(dict, locale, key as string, count, params),
    fmt: createFormatters(locale),
  }), [locale, dict, setLocale]);

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

export function useTp(): I18nContextValue["tp"] {
  return useI18n().tp;
}

export function useFmt(): Formatters {
  return useI18n().fmt;
}
