/**
 * Hero — carrossel de variantes A→B→C→D (6s, dots clicáveis), contador
 * real de máquinas (MachineCounter → /api/install/count), install box e
 * terminal `beheld view --snapshot`.
 */
import { InstallBox } from "@/components/landing/InstallBox";
import { MachineCounter } from "@/components/landing/MachineCounter";

import { T, useT } from "../T";
import { HERO_VARIANTS } from "../content";
import { useHeroRotation } from "../hooks";

export function Hero() {
  const t = useT();
  const [active, setActive] = useHeroRotation(HERO_VARIANTS, 6000);

  return (
    <header className="hero" id="top">
      <div className="wrap hero__grid">
        <div>
          <div className="hero__variants">
            {HERO_VARIANTS.map((v) => (
              <div
                key={v}
                className={`hero__variant ${active === v ? "is-active" : ""}`}
                data-variant={v}
              >
                <h1 className="hero__h"><T k={`hero.${v}.h`} /></h1>
                <p className="hero__lede"><T k={`hero.${v}.lede`} /></p>
              </div>
            ))}
          </div>

          <div className="hero__dots" role="tablist" aria-label="hero variants">
            {HERO_VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                className={`hero__dot ${active === v ? "is-active" : ""}`}
                data-target={v}
                aria-label={`variant ${v.toUpperCase()}`}
                onClick={() => setActive(v)}
              >
                <span></span>
              </button>
            ))}
          </div>

          <MachineCounter />

          <InstallBox />

          <p className="hero__meta">{t("hero.meta")}</p>
        </div>

        <div>
          <div className="term">
            <div className="term__bar">
              <span className="dots"><i></i><i></i><i></i></span>
              <span className="path">{t("hero.terminalTitle")}</span>
            </div>
            <div className="term__body">
              <span className="pmt">$</span> <span className="cmd">beheld view --snapshot</span>
              {"\n\n"}
              <span className="cm">{t("hero.terminalComment")}</span>
              {"\n\n"}
              {`  ${t("hero.terminal.stack")}   `}
              <span className="bar-fill">████████</span>
              <span className="bar-empty">░</span>
              {"  "}<span className="hl">87%</span>{"\n"}

              {`  ${t("hero.terminal.test")}            `}
              <span className="bar-fill">███</span>
              <span className="bar-empty">░░░░░░</span>
              {"  "}<span className="hl">38%</span>{"\n"}

              {`  ${t("hero.terminal.react")}           `}
              <span className="bar-empty">░░░░░░░░░</span>
              {"   "}<span className="hl">2%</span>{"\n\n"}

              {`  ${t("hero.terminal.sessions90d")}           `}<span className="hl">878</span>{"\n"}
              {`  ${t("hero.terminal.reposL1")}             `}<span className="hl">8</span>{"\n"}
              {`  ${t("hero.terminal.trajectory")}         `}<span className="hl">{t("hero.terminal.trajectoryVal")}</span>{"\n\n"}

              <span className="ar">→</span>{" "}<T k="hero.terminal.concl1" />{"\n"}
              <span className="ar">→</span>{" "}{t("hero.terminal.concl2")}
              <span className="cursor"></span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
