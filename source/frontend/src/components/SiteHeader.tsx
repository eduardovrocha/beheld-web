import { Link } from "react-router-dom";

import { B3Icon, CompromissoIcon, DaemonIcon, HomeIcon, OpenSourceIcon, SessionsIcon } from "@/components/icons";
import { LensLogo } from "@/components/LensLogo";
import { useT } from "@/i18n/I18nProvider";

const GITHUB_URL = "https://github.com/eduardovrocha/beheld";

export function SiteHeader({
  titleMain = "beheld",
  titleAccent = ".dev",
}: {
  titleMain?: string;
  titleAccent?: string;
} = {}) {
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
          {titleMain}
          <span style={{ color: "var(--accent)", fontWeight: 400 }}>{titleAccent}</span>
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
          to="/"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          <HomeIcon />
          <span>home</span>
        </Link>
        <span style={{ color: "var(--accent)" }}>·</span>
        <Link
          to="/b3"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          <B3Icon />
          <span>B3</span>
        </Link>
        <span style={{ color: "var(--accent)" }}>·</span>
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
