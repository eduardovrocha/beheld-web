/**
 * Hero — the top fold of the landing.
 *
 * Layout: 2-col grid (collapses to 1col under 900px).
 *   Left: h1 + lede + MachinesPill + install eyebrow + InstallLine +
 *         install-meta + freebar + ToolsRow.
 *   Right: ObservedTerminal (marketing-mock animation).
 *
 * All copy comes from i18n (PT-BR canonical, EN/ES translations).
 * Brand phrases ("Beheld by signal.", "Decided by you.", "forever
 * free for developers") stay identical across locales — see the
 * `landing.hero.*` keys in each dict.
 */
import { InstallLine } from "@/components/landing/InstallLine";
import { MachinesPill } from "@/components/landing/MachinesPill";
import { ObservedTerminal } from "@/components/landing/ObservedTerminal";
import { ToolsRow } from "@/components/landing/ToolsRow";
import { useT } from "@/i18n/I18nProvider";

export function Hero() {
  const t = useT();
  return (
    <section className="hero">
      <div>
        <h1 className="title reveal d2">
          {t("landing.hero.title_line1")}
          <br />
          <span className="em">{t("landing.hero.title_line2")}</span>
        </h1>
        <p className="lede reveal d3">{t("landing.hero.lede")}</p>

        <MachinesPill count={0} />

        <div className="reveal d4">
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {t("landing.hero.install_label")}
          </div>
          <InstallLine />
          <div className="install-meta">{t("landing.hero.install_meta")}</div>
          <div className="freebar">
            <span className="ff">{t("landing.hero.freebar_ff")}</span>
            <span className="dot">·</span>
            <span>{t("landing.hero.freebar_oss")}</span>
          </div>
          <ToolsRow />
        </div>
      </div>

      <ObservedTerminal />
    </section>
  );
}
