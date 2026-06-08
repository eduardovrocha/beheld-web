/**
 * TopActions — shared topbar identity cluster for the authenticated app
 * shells (dev + company dashboards), unified with the public SiteNav.
 *
 *   <ActionsCluster>   wrapper (.app__actions) → ThemeToggle + LanguageMenu
 *                      + whatever account menu the surface passes as children
 *   <ThemeToggle/>     icon button (moon/sun) — useShellTheme (data-theme-v2,
 *                      persisted in localStorage["beheld:theme"], shared with
 *                      the landing) — parallel to SiteNav's .nav__icon
 *   <LanguageMenu/>    PT/EN/ES dropdown — useI18n, identical to SiteNav
 *   <UserMenu/>        ● {name} ▾ trigger + menu header ({name} / {org});
 *                      body is a render-prop receiving `close` so each surface
 *                      composes its own items (SoonItem/ExternalItem/DangerItem)
 *
 * Single source of truth: the dev (DevTopActions) and company
 * (CompanyTopActions) clusters are thin compositions over this module.
 * Styles live in styles/app-shell.css (.app-v2 scope), imported by both
 * dashboards, mirroring the .dd vocabulary of styles/site-nav.css.
 */
import type { ReactNode } from "react";

import { useShellTheme } from "@/components/app/ShellThemeToggle";
import { useDropdown } from "@/hooks/useDropdown";
import { LOCALES, LOCALE_LABELS, LOCALE_NAMES } from "@/i18n/dict";
import { useI18n, useT } from "@/i18n/I18nProvider";

export function Chevron() {
  return (
    <svg className="dd__chev" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
      <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ThemeToggle() {
  const t = useT();
  const { toggle } = useShellTheme();
  return (
    <button type="button" className="app__icon" aria-label={t("shell.theme.toggle_aria")}
            onClick={toggle}>
      <svg className="ic ic--moon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M11.5 8.5a4.5 4.5 0 0 1-6-6 4.5 4.5 0 1 0 6 6z" fill="currentColor" />
      </svg>
      <svg className="ic ic--sun" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="2.6" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M7 1.5v1.6M7 10.9v1.6M1.5 7h1.6M10.9 7h1.6M3.1 3.1l1.1 1.1M9.8 9.8l1.1 1.1M3.1 10.9l1.1-1.1M9.8 4.2l1.1-1.1" />
        </g>
      </svg>
    </button>
  );
}

export function LanguageMenu() {
  const t = useT();
  const dd = useDropdown<HTMLDivElement>();
  const { locale, setLocale } = useI18n();
  return (
    <div ref={dd.ref} className="dd dd--lang" data-dd data-open={dd.open ? "1" : "0"}>
      <button type="button" className="dd__t" aria-haspopup="menu" aria-expanded={dd.open}
              aria-label={t("landingV2.nav.language.aria")} onClick={dd.toggle}>
        <span>{LOCALE_LABELS[locale]}</span>
        <Chevron />
      </button>
      <div className="dd__menu dd__menu--narrow" role="menu">
        {LOCALES.map((l) => {
          const active = locale === l;
          return (
            <button key={l} type="button" role="menuitemradio" aria-checked={active}
                    className={`dd__item dd__item--lang ${active ? "is-active" : ""}`}
                    onClick={() => { setLocale(l); dd.close(); }}>
              <span className="dd__code">{LOCALE_LABELS[l]}</span>
              <span className="dd__name">{LOCALE_NAMES[l]}</span>
              <span className="dd__check">✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Item desabilitado ("em breve") — a rota ainda não existe. */
export function SoonItem({ label, soon }: { label: string; soon: string }) {
  return (
    <button type="button" className="dd__item dd__item--soon" role="menuitem"
            aria-disabled="true" title={soon} disabled>
      <span>{label}</span>
      <span className="dd__soon">{soon}</span>
    </button>
  );
}

/** Link externo (nova aba, ícone ↗, muted). */
export function ExternalItem({ label, href, onSelect }: {
  label: string; href: string; onSelect?: () => void;
}) {
  return (
    <a className="dd__item dd__item--muted" href={href} target="_blank"
       rel="noopener noreferrer" role="menuitem" onClick={onSelect}>
      <span>{label}</span>
      <span className="dd__ar">↗</span>
    </a>
  );
}

/** Ação destrutiva (sair) — fundo avermelhado no hover. */
export function DangerItem({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <button type="button" className="dd__item dd__item--danger" role="menuitem" onClick={onSelect}>
      <span>{label}</span>
      <span className="dd__ar">→</span>
    </button>
  );
}

/**
 * Account menu shell. The body is a render-prop receiving `close` so callers
 * can wire it onto external links / the sign-out button (disabled SoonItems
 * never fire, so they don't need it).
 */
export function UserMenu({ name, org, menuAria, children }: {
  name: string;
  org: string;
  menuAria: string;
  children: (close: () => void) => ReactNode;
}) {
  const dd = useDropdown<HTMLDivElement>();
  return (
    <div ref={dd.ref} className="dd dd--user" data-dd data-open={dd.open ? "1" : "0"}>
      <button type="button" className="dd__t dd__t--user" aria-haspopup="menu"
              aria-expanded={dd.open} aria-label={menuAria} onClick={dd.toggle}>
        <span className="dot" aria-hidden="true" />
        <span className="you">{name}</span>
        <Chevron />
      </button>
      <div className="dd__menu" role="menu">
        <div className="dd__usr">
          <span className="dd__usr-name">{name}</span>
          <span className="dd__usr-org">{org}</span>
        </div>
        <div className="dd__sep" />
        {children(dd.close)}
      </div>
    </div>
  );
}

export function ActionsCluster({ children }: { children: ReactNode }) {
  return (
    <div className="app__actions">
      <ThemeToggle />
      <LanguageMenu />
      {children}
    </div>
  );
}
