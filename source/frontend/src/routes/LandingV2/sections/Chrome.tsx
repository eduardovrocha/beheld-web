/**
 * Chrome — Footer da landing. O nav é o SiteNav compartilhado
 * (components/SiteNav.tsx), padrão de todas as páginas públicas —
 * montado direto em routes/LandingV2/index.tsx com `landing`.
 */
import { BrandGlyph } from "@/components/landing/BrandMark";

import { useT } from "../T";

export function Footer() {
  const t = useT();
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
          <p className="fm fm--tag" style={{ margin: "14px 0 0" }}>{t("footer.tagline")}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="fm" style={{ margin: 0 }}>
            {t("footer.contact")}
            <a href="#">{t("footer.links.github")}</a>
            <a href="#">{t("footer.links.docs")}</a>
            <a href="#manifesto">{t("footer.links.manifesto")}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
