import { parse } from "node-html-parser";

export interface TocEntry {
  id: string;
  title: string;
}

export interface TocGroup {
  kind: "section" | "h2-only";
  id: string;
  title: string;
  children: TocEntry[];
}

function cleanTitle(raw: string): string {
  return raw.replace(/#\s*$/, "").trim();
}

export function buildToc(html: string): TocGroup[] {
  const root = parse(html);
  const headings = root.querySelectorAll("h2, h3");
  if (headings.length === 0) return [];

  const groups: TocGroup[] = [];
  let current: TocGroup | null = null;

  for (const h of headings) {
    const tag = h.tagName;
    const id = h.getAttribute("id") || "";
    const title = cleanTitle(h.text);

    if (tag === "H2") {
      current = { kind: "h2-only", id, title, children: [] };
      groups.push(current);
    } else if (tag === "H3") {
      if (!current) {
        current = { kind: "section", id: "", title: "Geral", children: [] };
        groups.push(current);
      } else if (current.kind === "h2-only") {
        current.kind = "section";
      }
      current.children.push({ id, title });
    }
  }

  return groups;
}
