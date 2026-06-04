/**
 * InstallLine — the `$ curl ... | sh` strip with a copy button.
 *
 * Reused in two places:
 *   - hero (under the lede)
 *   - CTA (bottom of page)
 *
 * The copy button uses `navigator.clipboard.writeText`, swaps to a
 * checkmark for ~1.4s on success, and silently no-ops on environments
 * where clipboard is denied (we don't want a broken-looking error UI
 * for that). The check colour is hard-coded to the term-prompt green
 * because we briefly want it to read as "ok" regardless of theme.
 */
import { useRef, useState } from "react";

import { useT } from "@/i18n/I18nProvider";

export type InstallLineProps = {
  /** The shell command to display and copy. Includes the `$` prompt? No — the `$` is rendered by us. */
  command?: string;
  /** Optional class on the outer wrapper for extra layout (e.g. reveal delay). */
  className?: string;
};

const DEFAULT_CMD = "curl -fsSL beheld.dev/install.sh | sh";

export function InstallLine({ command = DEFAULT_CMD, className }: InstallLineProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch (_) {
      // Clipboard API denied (e.g. non-secure context). Stay silent;
      // the user can still triple-click + Cmd+C the command text.
    }
  }

  return (
    <div className={className ? `install ${className}` : "install"}>
      <span className="pr">$</span>
      <span className="cmd">{command}</span>
      <button
        type="button"
        onClick={onCopy}
        title={t("landing.install.copy")}
        aria-label={t("landing.install.copy")}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <rect x={9} y={9} width={11} height={11} rx={2} />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  // Hard-coded to the green terminal prompt: this stays "ok" looking
  // regardless of theme, mirroring the mockup behaviour.
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#7ea66f" strokeWidth={2.2} aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
