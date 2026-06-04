/**
 * ToolsRow — the row of supported AI dev-tool icons in the hero.
 *
 * Data-driven from `AI_TOOLS` (src/config/ai-tools.ts). Renders
 * icon-only links (no text, no border) that pop on hover. Icons are
 * served from /public/icons/ai-tools/ and painted with the theme's
 * --accent via CSS `mask-image` on `.tool-glyph`. See
 * styles/landing-v5.css.
 *
 * Each link opens in a new tab with rel=noopener. The `title` doubles
 * as a tooltip ("{name} · {category}"); aria-label is just the name
 * for screen readers.
 */
import { AI_TOOLS, type AITool } from "@/config/ai-tools";
import { useT } from "@/i18n/I18nProvider";

export function ToolsRow({ tools = AI_TOOLS }: { tools?: AITool[] }) {
  const t = useT();
  return (
    <div className="tools">
      <div className="tools-label">{t("landing.tools.label")}</div>
      <div className="tools-row">
        {tools.map((tool) => (
          <a
            key={tool.id}
            className="tool"
            href={tool.website}
            target="_blank"
            rel="noopener noreferrer"
            title={`${tool.name} · ${tool.category}`}
            aria-label={tool.name}
          >
            <span
              className="tool-glyph"
              style={{
                WebkitMaskImage: `url("${tool.icon}")`,
                maskImage: `url("${tool.icon}")`,
              }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
