/**
 * HeroTerminal — static `$ beheld view --snapshot` output with signal
 * bars drawn in Unicode (█ filled / ░ empty) and a blinking block
 * cursor at the end.
 *
 * The body is `white-space: pre`, so column alignment is built here
 * with padEnd/padStart rather than baked into the copy — labels come
 * from i18n and vary in length per locale.
 */
import { useT } from "@/i18n/I18nProvider";

const LABEL_COL = 22; // label column width (chars) before bars/values
const VALUE_COL = 3; // right-aligned numeric column

export function HeroTerminal() {
  const t = useT();
  const lab = (key: Parameters<typeof t>[0]) => `  ${t(key).padEnd(LABEL_COL)}`;

  return (
    <div className="term">
      <div className="term__bar">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <span className="path">{t("landing.term.path")}</span>
      </div>
      <div className="term__body">
        <span className="pmt">$</span> <span className="cmd">{t("landing.term.cmd")}</span>
        {"\n\n"}
        <span className="cm">{t("landing.term.header")}</span>
        {"\n\n"}
        {lab("landing.term.l_stack")}
        <span className="bar-fill">████████</span>
        <span className="bar-empty">░</span>
        {"  "}
        <span className="hl">87%</span>
        {"\n"}
        {lab("landing.term.l_test")}
        <span className="bar-fill">███</span>
        <span className="bar-empty">░░░░░░</span>
        {"  "}
        <span className="hl">38%</span>
        {"\n"}
        {lab("landing.term.l_react")}
        <span className="bar-empty">░░░░░░░░░</span>
        {"   "}
        <span className="hl">2%</span>
        {"\n\n"}
        {lab("landing.term.l_sessions")}
        <span className="hl">{"878".padStart(VALUE_COL)}</span>
        {"\n"}
        {lab("landing.term.l_repos")}
        <span className="hl">{"8".padStart(VALUE_COL)}</span>
        {"\n"}
        {lab("landing.term.l_traj")}
        <span className="hl">{t("landing.term.v_traj")}</span>
        {"\n\n"}
        <span className="ar">→</span> {t("landing.term.concl1_pre")}
        <span className="hl">{t("landing.term.concl1_hl")}</span>
        {t("landing.term.concl1_post")}
        {"\n"}
        <span className="ar">→</span> {t("landing.term.concl2")}
        <span className="cursor" />
      </div>
    </div>
  );
}
