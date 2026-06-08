import { parse } from "node-html-parser";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function colorizeLine(line: string): string {
  const esc = escapeHtml(line);

  if (/^\s*▎/.test(line)) {
    return `<span class="hl">${esc}</span>`;
  }
  if (/^\s*🔧/.test(line)) {
    return `<span class="warn">${esc}</span>`;
  }
  if (/^[\s─]+$/.test(line) && line.includes("─")) {
    return `<span class="dim">${esc}</span>`;
  }
  if (/^\s*✓/.test(line)) {
    return esc.replace("✓", '<span class="ok">✓</span>');
  }
  if (/^\s*✗/.test(line)) {
    return esc.replace("✗", '<span class="err">✗</span>');
  }
  if (/^\s*⚠/.test(line)) {
    return esc.replace("⚠", '<span class="warn">⚠</span>');
  }
  if (/^\s*→/.test(line)) {
    return esc.replace("→", '<span class="arrow">→</span>');
  }
  if (/^\s*•/.test(line)) {
    return esc.replace("•", '<span class="arrow">•</span>');
  }
  if (/^\s*\$/.test(line)) {
    return esc.replace("$", '<span class="pmt">$</span>');
  }
  if (/^\s*!/.test(line)) {
    return esc.replace(/(\s*)!/, '$1<span class="warn">!</span>');
  }

  return esc;
}

const CODE_WRAPPER = /^<code(?:\s[^>]*)?>([\s\S]*)<\/code>$/;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function colorizePre(html: string): string {
  const root = parse(html);

  root.querySelectorAll("pre").forEach((pre) => {
    let text = pre.text;
    const codeMatch = text.match(CODE_WRAPPER);
    const wrappedInCode = !!codeMatch;
    if (codeMatch) {
      text = decodeEntities(codeMatch[1]);
    }
    const lines = text.split("\n");
    const colored = lines.map(colorizeLine).join("\n");
    const finalHtml = wrappedInCode ? `<code>${colored}</code>` : colored;
    pre.set_content(finalHtml);
  });

  return root.toString();
}
