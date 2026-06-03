import { useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/icons";
import { useT } from "@/i18n/I18nProvider";

const INSTALL_CMD = "curl -fsSL beheld.dev/install.sh | sh";

/**
 * Card de instalação reusado nas 4 views (home, /como-funciona, /sessoes-reais,
 * /b3). Botão de copiar adota o estilo [ícone · label] do resto da landing —
 * CopyIcon no estado idle, CheckIcon (em accent --ok) no sucesso.
 */
export function InstallCard() {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };
  return (
    <div
      className="p-5"
      style={{ maxWidth: 640 }}
    >
      <div
        className="mb-2.5 font-mono uppercase"
        style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
      >
        {t("home.install.label")}
      </div>
      <div className="flex items-center gap-2.5 font-mono" style={{ color: "var(--text)", fontSize: 13 }}>
        <span className="font-medium" style={{ color: "var(--accent)" }}>
          $
        </span>
        <span>{INSTALL_CMD}</span>
        <button
          type="button"
          onClick={onCopy}
          className={`ml-auto inline-flex cursor-pointer items-center gap-1.5 font-mono transition-colors hover:underline ${copied ? "" : "uppercase"}`}
          style={{
            border: "none",
            color: copied ? "var(--ok)" : "var(--muted)",
            padding: 0,
            fontSize: 10,
            letterSpacing: "0.14em",
            background: "transparent",
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? t("home.install.copied") : t("home.install.copy")}</span>
        </button>
      </div>
    </div>
  );
}
