import { Link } from "react-router-dom";

import { CompromissoIcon, DaemonIcon, OpenSourceIcon, SessionsIcon } from "@/components/icons";
import { useT } from "@/i18n/I18nProvider";

const GITHUB_URL = "https://github.com/eduardovrocha/beheld";

function LensLogo() {
  return (
    <svg
      viewBox="0 0 240 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Beheld lens logo"
      className="h-16 w-auto"
      style={{ color: "var(--lens)" }}
    >
      <g stroke="currentColor" strokeWidth={1} opacity={0.35} strokeLinecap="round">
        <line x1="16" y1="50" x2="28" y2="50" />
        <line x1="212" y1="50" x2="224" y2="50" />
      </g>
      <path d="M 60 24 Q 40 50 60 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M 180 24 Q 200 50 180 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <line x1="66" y1="50" x2="174" y2="50" stroke="currentColor" strokeWidth={1} strokeDasharray="2 6" opacity={0.45} />
      <circle cx="120" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="120" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  const t = useT();
  return (
    <div
      className="mb-14 pb-12 text-center"
      style={{ borderBottom: "1px solid var(--rule-soft)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <Link to="/" aria-label="Beheld home" className="inline-block">
          <LensLogo />
        </Link>
        <Link
          to="/"
          className="font-semibold hover:opacity-90"
          style={{ color: "var(--text)", fontSize: 44, letterSpacing: "-0.025em", lineHeight: 1 }}
        >
          Beheld
          <span style={{ color: "var(--accent)", fontWeight: 400 }}>.dev</span>
        </Link>
        <div
          className="font-normal uppercase"
          style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
        >
          Beheld by <span style={{ color: "var(--accent)" }}>signal</span>. Decided by{" "}
          <span style={{ color: "var(--accent)" }}>you</span>.
        </div>
      </div>
      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono uppercase"
        style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
      >
        <Link
          to="/como-funciona"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          <DaemonIcon />
          <span>{t("home.head.daemon")}</span>
        </Link>
        <span style={{ color: "var(--accent)" }}>·</span>
        <Link
          to="/sessoes-reais"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          <SessionsIcon />
          <span>{t("home.head.real_sessions")}</span>
        </Link>
        <span style={{ color: "var(--accent)" }}>·</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          <OpenSourceIcon />
          <span>{t("home.head.open_source")}</span>
        </a>
        <span style={{ color: "var(--accent)" }}>·</span>
        <Link
          to="/compromisso"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          <CompromissoIcon />
          <span>compromisso</span>
        </Link>
      </div>
    </div>
  );
}
