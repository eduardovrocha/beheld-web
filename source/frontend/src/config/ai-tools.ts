// AI dev-tool catalog rendered by the landing's ToolsRow.
//
// `icon` is the path of an SVG served from `public/icons/ai-tools/`.
// The SVGs are mono-color (`fill="currentColor"`) so they pick up the
// current theme's `--accent` via CSS without per-theme variants.
//
// `continue.svg` and `codex.svg` are placeholder marks — there is no
// open-source official logo. Replace with the official files once
// approved, keeping the same `id`/`name`.

export interface AITool {
  id: string;
  name: string;
  category: "cli" | "ide" | "extension";
  icon: string;
  website: string;
}

export const AI_TOOLS: AITool[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    category: "cli",
    icon: "/icons/ai-tools/claude-code.svg",
    website: "https://www.anthropic.com",
  },
  {
    id: "continue-vscode",
    name: "Continue",
    category: "extension",
    icon: "/icons/ai-tools/continue.svg",
    website: "https://www.continue.dev",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    category: "ide",
    icon: "/icons/ai-tools/windsurf.svg",
    website: "https://windsurf.com",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    category: "cli",
    icon: "/icons/ai-tools/gemini.svg",
    website: "https://gemini.google.com",
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    category: "cli",
    icon: "/icons/ai-tools/codex.svg",
    website: "https://openai.com",
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "ide",
    icon: "/icons/ai-tools/cursor.svg",
    website: "https://cursor.com",
  },
  {
    id: "copilot-cli",
    name: "GitHub Copilot CLI",
    category: "cli",
    icon: "/icons/ai-tools/copilot.svg",
    website: "https://github.com/features/copilot",
  },
  {
    id: "copilot-vscode",
    name: "GitHub Copilot",
    category: "extension",
    icon: "/icons/ai-tools/copilot.svg",
    website: "https://github.com/features/copilot",
  },
];
