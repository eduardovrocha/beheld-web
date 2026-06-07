/**
 * CTA — band final: headline, sub (GitHub prova código…), segundo
 * install box (estado de cópia independente do hero — instância própria
 * do InstallBox) e badge "forever free".
 */
import { InstallBox } from "@/components/landing/InstallBox";

import { T, useT } from "../T";

export function CTA() {
  const t = useT();
  return (
    <section className="cta-band">
      <div className="wrap">
        <h2 className="cta-band__h"><T k="cta.h" /></h2>
        <p className="cta-band__sub"><T k="cta.sub" /></p>
        <InstallBox />
        <p className="cta-band__free">{t("cta.free")}</p>
      </div>
    </section>
  );
}
