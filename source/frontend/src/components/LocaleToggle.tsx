/**
 * Locale toggle — three buttons (PT · ES · EN) with the active one
 * highlighted in --accent. Mirrors the floating controls box in the
 * beheld-landing-v4 mock.
 */
import { LOCALES, LOCALE_LABELS } from "@/i18n/dict";
import { useI18n } from "@/i18n/I18nProvider";

const BTN_STYLE: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  padding: 0,
  transition: "color 150ms ease",
};

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1.5">
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLocale(l)}
            style={{
              ...BTN_STYLE,
              color: locale === l ? "var(--accent)" : "var(--muted)",
            }}
            onMouseEnter={(e) => {
              if (locale !== l) e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              if (locale !== l) e.currentTarget.style.color = "var(--muted)";
            }}
          >
            {LOCALE_LABELS[l]}
          </button>
          {i < LOCALES.length - 1 ? (
            <span
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 10,
                color: "var(--rule)",
                userSelect: "none",
              }}
            >
              ·
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
