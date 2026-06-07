/**
 * PublicFooter — footer padrão das páginas públicas (par do SiteNav):
 * landing (/), /empresa/cadastro, /empresa/entrar e /v/:id.
 *
 *   left:  brand lockup (BrandGlyph 22px + wordmark) + tagline
 *   right: contato + links (GitHub · Docs · Manifesto)
 *
 * Não confundir com components/SiteFooter.tsx — o footer LEGADO das
 * rotas temáticas dentro do <Layout> (Compromisso/HowItWorks/…).
 *
 * Fora da landing o link Manifesto vira "/#manifesto" (navegação plena
 * de volta pra home). Copy nas chaves landingV2.footer.*; estilos em
 * styles/public-footer.css — os tokens vêm do escopo pai
 * (.landing-v2-kit na landing, .app-v2 nas telas de app).
 */
import { BrandGlyph } from "@/components/landing/BrandMark";
import { useT } from "@/i18n/I18nProvider";

import "@/styles/public-footer.css";

export type PublicFooterProps = {
  /** true na landing: link Manifesto usa âncora local (#manifesto). */
  landing?: boolean;
};

export function PublicFooter({ landing = false }: PublicFooterProps) {
  const t = useT();
  const anchor = landing ? "" : "/";
  return (
    <footer className="site-foot">
      <div className="wrap site-foot__grid">
        <div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <BrandGlyph size={22} />
            <span className="lk-word" style={{ fontSize: 22 }}>
              <span className="b">b</span>eheld
            </span>
          </span>
          <p className="fm fm--tag" style={{ margin: "14px 0 0" }}>
            {t("landingV2.footer.tagline")}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="fm" style={{ margin: 0 }}>
            {t("landingV2.footer.contact")}
            <a href="#">{t("landingV2.footer.links.github")}</a>
            <a href="#">{t("landingV2.footer.links.docs")}</a>
            <a href={`${anchor}#manifesto`}>{t("landingV2.footer.links.manifesto")}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
