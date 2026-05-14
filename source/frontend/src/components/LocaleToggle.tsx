/**
 * Locale toggle — cycles PT → EN → ES → PT, persisting via I18nProvider.
 * Same visual language as ThemeToggle so the two sit side-by-side in nav.
 */
import { LOCALES, LOCALE_LABELS, LOCALE_NAMES } from "@/i18n/dict";
import { useI18n } from "@/i18n/I18nProvider";

export function LocaleToggle() {
  const { locale, setLocale, t } = useI18n();

  function cycle() {
    const idx = LOCALES.indexOf(locale);
    const next = LOCALES[(idx + 1) % LOCALES.length];
    setLocale(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t("locale.aria")}
      title={`${t("locale.aria")} (${LOCALE_NAMES[locale]})`}
      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
    >
      <span aria-hidden="true">🌐</span>
      <span>{LOCALE_LABELS[locale]}</span>
    </button>
  );
}
