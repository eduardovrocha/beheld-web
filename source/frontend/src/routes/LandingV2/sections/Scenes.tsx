/**
 * Scenes (07) — cenas reais: 4 cards + a cena final em destaque
 * ocupando a linha inteira (scene--final).
 */
import { Eyebrow } from "@/components/landing/Eyebrow";

import { useT } from "../T";
import { SCENES } from "../content";

export function Scenes() {
  const t = useT();
  return (
    <section style={{ background: "var(--bg-2)" }}>
      <div className="wrap">
        <Eyebrow idx="07">{t("scenes.eyebrow")}</Eyebrow>
        <div className="scenes scenes--grid" data-reveal>
          {SCENES.map((scene) => (
            <div
              key={scene.key}
              className={`scene ${scene.final ? "scene--final" : ""}`}
            >
              <p className="scene__s">{t(`scenes.${scene.key}.s`)}</p>
              <p className="scene__r">
                <span className="ar">→</span> {t(`scenes.${scene.key}.r`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
