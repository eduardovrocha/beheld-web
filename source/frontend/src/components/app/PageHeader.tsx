/**
 * PageHeader — title block (eyebrow / h1 / subtitle / fingerprint+copy)
 * with end-aligned CTAs. The COPIAR button writes the full fingerprint
 * to the clipboard and announces "copiado ✓" (aria-live) for 1500 ms.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useT } from "@/i18n/I18nProvider";

export function PageHeader({ eyebrow, title, subtitle, fingerprint, cta }: {
  /** Eyebrow segments, e.g. ["dashboard", "@dev-511ac8da"] — last one in signal. */
  eyebrow: string[];
  title: string;
  subtitle: string;
  fingerprint?: string;
  cta?: ReactNode;
}) {
  return (
    <header className="page-h">
      <div>
        <p className="page-h__eb">
          {eyebrow.map((seg, i) => (
            <span key={i} style={{ display: "contents" }}>
              {i > 0 && <span className="sl">/</span>}
              <span className={i === eyebrow.length - 1 && eyebrow.length > 1 ? "who" : undefined}>{seg}</span>
            </span>
          ))}
        </p>
        <h1>{title}</h1>
        <p className="page-h__sub">{subtitle}</p>
        {fingerprint && <FingerprintRow fingerprint={fingerprint} />}
      </div>
      {cta && <div className="page-h__cta">{cta}</div>}
    </header>
  );
}

function FingerprintRow({ fingerprint }: { fingerprint: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fingerprint);
    } catch {
      /* clipboard unavailable — keep the visual feedback anyway */
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="page-h__fp">
      <span>{t("dashboard.hero.fingerprint_label")}</span>
      <code>{fingerprint}</code>
      <button type="button" className={`copy${copied ? " copied" : ""}`} onClick={copy} aria-live="polite">
        {copied ? t("dashboard.fp.copied") : t("dashboard.fp.copy")}
      </button>
    </div>
  );
}

/** Shell button — mono uppercase, square. `primary` = signal-tinted CTA. */
export function ShellButton({ primary = false, icon, children, ...props }: {
  primary?: boolean;
  icon?: ReactNode;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={`btn${primary ? " btn--primary" : ""}`}>
      {icon && <span className="ic" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

export const CheckIcon = (
  <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
    <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const UpArrowIcon = (
  <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
    <path d="M6 1.5v9M2 5.5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
