/**
 * InstallBox — the `[ $ ] curl ... | sh [COPIAR]` strip.
 *
 * Used twice on the page (hero + CTA band). The copy button writes the
 * command via `navigator.clipboard.writeText`, swaps its label to
 * "copiado ✓" + gains `.copied` (green border/text) for 1.6s, then
 * resets. Clipboard denial (non-secure context) no-ops silently — the
 * user can still select + copy the text by hand.
 */
import { useEffect, useRef, useState } from "react";

import { useT } from "@/i18n/I18nProvider";

export type InstallBoxProps = {
  /** The shell command displayed and copied (the `$` prompt is ours). */
  command?: string;
  /** Optional class on the wrapper (e.g. reveal). */
  className?: string;
};

const DEFAULT_CMD = "curl -fsSL beheld.dev/install.sh | sh";
const RESET_MS = 1600;

export function InstallBox({ command = DEFAULT_CMD, className }: InstallBoxProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), RESET_MS);
    } catch (_) {
      // Clipboard API denied — stay silent.
    }
  }

  return (
    <div className={className ? `install ${className}` : "install"}>
      <span className="pmt">$</span>
      <code>{command}</code>
      <button type="button" onClick={onCopy} className={copied ? "copied" : undefined}>
        {copied ? t("landing.install.copied") : t("landing.install.copy")}
      </button>
    </div>
  );
}
