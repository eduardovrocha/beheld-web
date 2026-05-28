/**
 * Formatação regional via Intl API, ligada ao locale ativo.
 * Moeda padrão por locale: pt→BRL, en→USD, es→EUR (sobrescrevível).
 */
import { BCP47, type Locale } from "./dict";

const DEFAULT_CURRENCY: Record<Locale, string> = { pt: "BRL", en: "USD", es: "EUR" };

export interface Formatters {
  /** Número simples (separadores regionais). */
  number: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** Moeda (default conforme locale). */
  currency: (n: number, currency?: string) => string;
  /** Percentual — recebe FRAÇÃO (0.35 → "35%"). */
  percent: (fraction: number, opts?: Intl.NumberFormatOptions) => string;
  /** Data (default dd/mm/aaaa conforme locale). */
  date: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  /** Hora (default HH:MM). */
  time: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  /** Tempo relativo ("há 3 dias"). */
  relative: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
}

function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

export function createFormatters(locale: Locale): Formatters {
  const bcp = BCP47[locale];
  return {
    number: (n, opts) => new Intl.NumberFormat(bcp, opts).format(n),
    currency: (n, currency = DEFAULT_CURRENCY[locale]) =>
      new Intl.NumberFormat(bcp, { style: "currency", currency }).format(n),
    percent: (fraction, opts) =>
      new Intl.NumberFormat(bcp, { style: "percent", maximumFractionDigits: 0, ...opts }).format(fraction),
    date: (d, opts) =>
      new Intl.DateTimeFormat(bcp, opts ?? { day: "2-digit", month: "2-digit", year: "numeric" }).format(toDate(d)),
    time: (d, opts) =>
      new Intl.DateTimeFormat(bcp, opts ?? { hour: "2-digit", minute: "2-digit" }).format(toDate(d)),
    relative: (value, unit) =>
      new Intl.RelativeTimeFormat(bcp, { numeric: "auto" }).format(value, unit),
  };
}
