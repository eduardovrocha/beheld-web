function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderTocLabel(raw: string): string {
  const txt = raw.trim().replace(/`/g, "");

  const subcommandMatch = txt.match(/^beheld\s*\(([^)]+)\)\s*$/);
  if (subcommandMatch) {
    return `<code>beheld</code> <span class="toc__hint">${escapeHtml(subcommandMatch[1])}</span>`;
  }

  const subcommand = txt.match(/^beheld\s+(.+)$/);
  if (subcommand) {
    const cleaned = subcommand[1]
      .replace(/\[[^\]]*\]/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return `<code>${escapeHtml(cleaned)}</code>`;
  }

  return escapeHtml(txt);
}
