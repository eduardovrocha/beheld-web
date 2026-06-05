/**
 * Hero — the top fold of landing v2.
 *
 * 2-col grid (1fr / 1.12fr, stacks under 980px):
 *   Left:  h1 ("Beheld by signal. / Decided by you." — brand phrase,
 *          identical across locales) + lede + MachineCounter +
 *          InstallBox + mono meta line.
 *   Right: HeroTerminal (static snapshot output).
 */
import { HeroTerminal } from "@/components/landing/HeroTerminal";
import { InstallBox } from "@/components/landing/InstallBox";
import { MachineCounter } from "@/components/landing/MachineCounter";
import { useT } from "@/i18n/I18nProvider";

export function Hero() {
  const t = useT();
  return (
    <header className="hero" id="top">
      <div className="wrap hero__grid">
        <div>
          <h1 className="hero__h">
            <span className="hero__h__l1">
              <span className="sig">{t("landing.hero.h1_sig")}</span>
              {t("landing.hero.h1_rest")}
            </span>
            <br />
            <span className="hero__h__l2">{t("landing.hero.h1_line2")}</span>
          </h1>
          <p className="hero__lede">
            {t("landing.hero.lede_pre")}
            <b>{t("landing.hero.lede_b")}</b>
            {t("landing.hero.lede_post")}
          </p>
          <MachineCounter />
          <InstallBox />
          <p className="hero__meta">{t("landing.hero.meta")}</p>
        </div>

        <div>
          <HeroTerminal />
        </div>
      </div>
    </header>
  );
}
