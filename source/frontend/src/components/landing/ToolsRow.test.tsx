/**
 * ToolsRow — renders every entry from AI_TOOLS with correct href,
 * aria-label, and mask-image URL.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AI_TOOLS } from "@/config/ai-tools";

import { ToolsRow } from "./ToolsRow";

describe("ToolsRow", () => {
  it("renders one anchor per AI_TOOLS entry", () => {
    const { container } = render(<ToolsRow />);
    const anchors = container.querySelectorAll("a.tool");
    expect(anchors.length).toBe(AI_TOOLS.length);
  });

  it("each anchor points to the tool's website and opens in a new tab", () => {
    const { container } = render(<ToolsRow />);
    // Iterate by index so we cover entries that share a website
    // (e.g. copilot-cli and copilot-vscode both point at the same URL
    // — querying by [href=…] would match the first one twice).
    const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>("a.tool"));
    expect(anchors.length).toBe(AI_TOOLS.length);
    anchors.forEach((a, i) => {
      const tool = AI_TOOLS[i];
      expect(a.getAttribute("href")).toBe(tool.website);
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
      expect(a.getAttribute("aria-label")).toBe(tool.name);
      expect(a.getAttribute("title")).toBe(`${tool.name} · ${tool.category}`);
    });
  });

  it("paints the icon via CSS mask so currentColor wins (--accent)", () => {
    const { container } = render(<ToolsRow />);
    const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>("a.tool"));
    anchors.forEach((a, i) => {
      const tool = AI_TOOLS[i];
      const glyph = a.querySelector(".tool-glyph") as HTMLElement | null;
      expect(glyph).not.toBe(null);
      const styleAttr = glyph?.getAttribute("style") ?? "";
      expect(styleAttr).toContain(tool.icon);
      expect(styleAttr.toLowerCase()).toContain("mask-image");
    });
  });

  it("renders an empty row if given an empty tools list", () => {
    const { container } = render(<ToolsRow tools={[]} />);
    expect(container.querySelectorAll("a.tool").length).toBe(0);
  });
});
