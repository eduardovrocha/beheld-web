/**
 * SiteNav — nav padrão das páginas públicas: landing (/),
 * /empresa/cadastro, /empresa/entrar e /v/:id.
 *
 *   left:   brand lockup (BrandGlyph 24px + Wordmark) → #top na landing,
 *           "/" nas demais
 *   center: âncoras da landing (Manifesto · B3H31D · Sessões reais ·
 *           Verificação · Para empresas) — fora da landing viram
 *           "/#section" (navegação plena de volta pra home)
 *   right:  `extraRight` (ex.: "já tem conta? entrar" no cadastro, CTA
 *           "criar minha conta" no perfil público) + ShellThemeToggle +
 *           LocaleToggle + badge "forever free"
 *
 * Copy nas chaves landingV2.nav.*; estilos em styles/site-nav.css —
 * os tokens (--ink/--line/--signal…) vêm do escopo pai
 * (.landing-v2-kit na landing, .app-v2 nas telas de app). Links são
 * <a> planos de propósito: o nav renderiza fora de contexto de Router
 * em testes, e a troca de shell funciona bem como navegação plena.
 */
import type { ReactNode } from "react";

import { LocaleToggle } from "@/components/LocaleToggle";
import { ShellThemeToggle } from "@/components/app/ShellThemeToggle";
import { BrandGlyph, Wordmark } from "@/components/landing/BrandMark";
import { useT } from "@/i18n/I18nProvider";

import "@/styles/site-nav.css";

export type SiteNavProps = {
  /** true na landing: âncoras locais (#manifesto) e brand → #top. */
  landing?: boolean;
  /** Conteúdo extra no nav__right, antes dos toggles. */
  extraRight?: ReactNode;
};

export function SiteNav({ landing = false, extraRight }: SiteNavProps) {
  const t = useT();
  const anchor = landing ? "" : "/";
  return (
    <nav className="nav site-nav">
      <div className="wrap nav__in">
        <a className="nav__brand" href={landing ? "#top" : "/"}>
          <span className="nav__glyph">
            <BrandGlyph size={24} />
          </span>
          <Wordmark />
        </a>
        <div className="nav__links">
          <a href={`${anchor}#manifesto`}>{t("landingV2.nav.links.manifesto")}</a>
          <a href={`${anchor}#B3H31D`}>{t("landingV2.nav.links.B3H31D")}</a>
          <a href={`${anchor}#sessoes`}>{t("landingV2.nav.links.sessions")}</a>
          <a href={`${anchor}#verificacao`}>{t("landingV2.nav.links.verification")}</a>
          <a href="/empresa/cadastro">{t("landingV2.nav.links.companies")}</a>
        </div>
        <div className="nav__right">
          {extraRight}
          <ShellThemeToggle />
          <LocaleToggle />
          <span className="nav__free">{t("landingV2.nav.free")}</span>
        </div>
      </div>
    </nav>
  );
}
