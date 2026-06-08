import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { liftLabels } from "./lift-labels";
import { colorizePre } from "./colorize-pre";
import { addHeadingIds } from "./add-heading-ids";
import { buildToc, type TocGroup } from "./build-toc";

export interface ParsedDoc {
  html: string;
  toc: TocGroup[];
  title: string;
  subtitle: string;
}

function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function extractSubtitle(md: string): string {
  const match = md.match(/^>\s+(.+)$/m);
  if (!match) return "";
  return match[1].replace(/`/g, "").replace(/\*\*/g, "");
}

marked.use({ gfm: true, breaks: false });

export function parseMarkdown(md: string): ParsedDoc {
  const rawHtml = marked.parse(md, { async: false }) as string;
  const safe = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

  let html = safe;
  html = liftLabels(html);
  html = colorizePre(html);
  html = addHeadingIds(html);

  const toc = buildToc(html);
  const title = extractTitle(md);
  const subtitle = extractSubtitle(md);

  return { html, toc, title, subtitle };
}
