/**
 * i18n core — dicionários carregados de /locales/*.json.
 *
 * pt-BR (padrão) e en (fallback) são empacotados estaticamente; es é
 * carregado sob demanda (code-split via import dinâmico). Chaves são planas e
 * dot-namespaced (nav.*, company.*, positions.*); valores aceitam tokens
 * {placeholder} e variantes de plural `chave.one` / `chave.other`.
 */
import ptBR from "@/locales/pt-BR.json";
import en from "@/locales/en.json";

export type Locale = "pt" | "en" | "es";
export const LOCALES: Locale[] = ["pt", "en", "es"];
export const LOCALE_LABELS: Record<Locale, string> = { pt: "PT", en: "EN", es: "ES" };
export const LOCALE_NAMES: Record<Locale, string> = { pt: "Português", en: "English", es: "Español" };

// Tag BCP-47 usada pela Intl API (número/moeda/data).
export const BCP47: Record<Locale, string> = { pt: "pt-BR", en: "en", es: "es" };

export type Dict = Record<string, string>;
// Chaves tipadas derivadas do pt-BR (fonte canônica) — autocomplete + segurança,
// sem travar chaves dinâmicas.
export type TKey = keyof typeof ptBR;
export type Translatable = TKey | (string & {});

const ptDict = ptBR as Dict;
const enDict = en as Dict;

// pt-BR + en sempre presentes (padrão + base de fallback). es é assíncrono.
const cache: Partial<Record<Locale, Dict>> = { pt: ptDict, en: enDict };

export function loadedDict(locale: Locale): Dict {
  return cache[locale] ?? ptDict;
}

export async function loadLocale(locale: Locale): Promise<Dict> {
  if (cache[locale]) return cache[locale]!;
  if (locale === "es") {
    const mod = await import("@/locales/es.json");
    cache.es = mod.default as Dict;
    return cache.es;
  }
  return ptDict;
}

/** Resolve uma chave com fallback: ativo → pt-BR → en → própria chave. */
export function resolve(active: Dict, key: string): string {
  return active[key] ?? ptDict[key] ?? enDict[key] ?? key;
}

/** Substitui tokens {placeholder} pelo valor correspondente em `params`. */
export function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * Pluralização via Intl.PluralRules: escolhe `key.<categoria>` (one/other/…)
 * com fallback para `key.other`. Injeta {count} automaticamente.
 */
export function pluralize(
  active: Dict,
  locale: Locale,
  key: string,
  count: number,
  params?: Record<string, string | number>,
): string {
  const cat = new Intl.PluralRules(BCP47[locale]).select(count);
  const tmpl = active[`${key}.${cat}`] ?? active[`${key}.other`]
            ?? ptDict[`${key}.${cat}`] ?? ptDict[`${key}.other`] ?? key;
  return format(tmpl, { count, ...params });
}
