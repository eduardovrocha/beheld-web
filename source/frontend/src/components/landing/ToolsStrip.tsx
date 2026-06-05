/**
 * ToolsStrip — thin "ferramentas suportadas" band under the hero.
 *
 * Eyebrow label + flex row of items, each prefixed by an 8×8 square
 * (signal green for first-class tools, --ink-5 for the muted ones).
 */
import { useT } from "@/i18n/I18nProvider";

export function ToolsStrip() {
  const t = useT();
  return (
    <div className="tools">
      <div className="wrap tools__in">
        <span className="tools__lab">{t("landing.tools.label")}</span>
        <span className="tools__item">Claude Code</span>
        <span className="tools__item">Continue.dev</span>
        <span className="tools__item muted">{t("landing.tools.mcp")}</span>
        <span className="tools__item muted">{t("landing.tools.ides")}</span>
      </div>
    </div>
  );
}
