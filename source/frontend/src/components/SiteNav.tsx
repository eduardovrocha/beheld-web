/**
 * SiteNav — nav padrão das páginas públicas: landing (/),
 * /empresa/cadastro, /empresa/entrar e /v/:id.
 *
 *   left:   brand lockup (glyph currentColor + wordmark) → #top na
 *           landing, "/" nas demais
 *   center: âncoras da landing (Manifesto · B3H31D · Sessões reais ·
 *           Verificação) — fora da landing viram "/#section"
 *   right:  cluster .nav__actions consolidando empresa/tema/idioma —
 *             · `extraRight` (ex.: CTA por página) quando passado
 *             · <CompanyMenu>  dropdown: Entrar · Criar conta · Vendas
 *             · <ThemeToggle>  botão de ícone lua/sol
 *             · <LanguageMenu> dropdown PT/EN/ES (ativo com ✓)
 *             · badge "forever free for developers" (some <1100px)
 *
 * Adaptado do kit landing-v2-integration-nav às convenções do app: i18n
 * próprio (useI18n/useT, sem react-i18next), tema via useShellTheme →
 * html[data-theme-v2="light"] (NÃO data-theme, que é o dp-theme legado).
 * Estilos em styles/site-nav.css; os tokens vêm do escopo pai
 * (.landing-v2-kit na landing, .app-v2 nas telas de app). Links de
 * empresa são <a> planos: o nav renderiza fora de Router em testes e a
 * troca de shell funciona como navegação plena.
 */
import type { ReactNode } from "react";

import { useDropdown } from "@/hooks/useDropdown";
import { useShellTheme } from "@/components/app/ShellThemeToggle";
import { BrandGlyph, Wordmark } from "@/components/landing/BrandMark";
import { LOCALES, LOCALE_LABELS, LOCALE_NAMES } from "@/i18n/dict";
import { useI18n, useT } from "@/i18n/I18nProvider";

import "@/styles/site-nav.css";

export type SiteNavProps = {
  /** true na landing: âncoras locais (#manifesto) e brand → #top. */
  landing?: boolean;
  /** Conteúdo extra no nav__actions, antes do cluster de empresa/tema/idioma. */
  extraRight?: ReactNode;
};

function Chevron() {
  return (
    <svg className="dd__chev" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
      <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompanyMenu() {
  const t = useT();
  const dd = useDropdown<HTMLDivElement>();
  return (
    <div ref={dd.ref} className="dd" data-dd data-open={dd.open ? "1" : "0"}>
      <button type="button" className="dd__t" aria-haspopup="menu" aria-expanded={dd.open}
              onClick={dd.toggle}>
        {t("landingV2.nav.companies.trigger")}
        <Chevron />
      </button>
      <div className="dd__menu" role="menu" onClick={dd.close}>
        <div className="dd__lab">{t("landingV2.nav.companies.existingLabel")}</div>
        <a className="dd__item dd__item--primary" href="/empresa/entrar" role="menuitem">
          <span>{t("landingV2.nav.companies.signIn")}</span>
          <span className="dd__ar">→</span>
        </a>
        <div className="dd__sep" />
        <div className="dd__lab">{t("landingV2.nav.companies.newLabel")}</div>
        <a className="dd__item" href="/empresa/cadastro" role="menuitem">
          <span>{t("landingV2.nav.companies.createAccount")}</span>
          <span className="dd__ar">→</span>
        </a>
        <a className="dd__item dd__item--muted" href="mailto:hi@beheld.dev" role="menuitem">
          <span>{t("landingV2.nav.companies.sales")}</span>
          <span className="dd__ar">→</span>
        </a>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const t = useT();
  const { toggle } = useShellTheme();
  return (
    <button type="button" className="nav__icon" aria-label={t("landingV2.nav.theme.aria")}
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

function LanguageMenu() {
  const t = useT();
  const dd = useDropdown<HTMLDivElement>();
  const { locale, setLocale } = useI18n();
  return (
    <div ref={dd.ref} className="dd dd--lang" data-dd data-open={dd.open ? "1" : "0"}>
      <button type="button" className="dd__t dd__t--icon" aria-haspopup="menu"
              aria-expanded={dd.open} aria-label={t("landingV2.nav.language.aria")}
              onClick={dd.toggle}>
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

export function SiteNav({ landing = false, extraRight }: SiteNavProps) {
  const t = useT();
  const anchor = landing ? "" : "/";
  return (
    <nav className="nav site-nav">
      <div className="wrap nav__in">
        <a className="nav__brand" href={landing ? "#top" : "/"}>
          <span className="nav__glyph" style={{ color: "var(--ink)" }}>
            <BrandGlyph size={24} />
          </span>
          <Wordmark />
        </a>
        <div className="nav__links">
          <a href={`${anchor}#manifesto`}>{t("landingV2.nav.links.manifesto")}</a>
          <a href={`${anchor}#B3H31D`}>{t("landingV2.nav.links.B3H31D")}</a>
          <a href={`${anchor}#sessoes`}>{t("landingV2.nav.links.sessions")}</a>
          <a href={`${anchor}#verificacao`}>{t("landingV2.nav.links.verification")}</a>
        </div>
        <div className="nav__actions">
          {extraRight}
          <CompanyMenu />
          <ThemeToggle />
          <LanguageMenu />
          <span className="nav__free">{t("landingV2.nav.free")}</span>
        </div>
      </div>
    </nav>
  );
}
