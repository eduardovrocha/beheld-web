import { useT } from "@/i18n/I18nProvider";

const INSTALL_CMD = "curl -fsSL beheld.dev/install.sh | sh";
const GITHUB_URL = "https://github.com/eduardovrocha/beheld";

export function SiteFooter() {
  const t = useT();
  return (
    <footer
      className="mt-6 grid items-end gap-8 py-16 sm:grid-cols-2"
      style={{ borderTop: "1px solid var(--rule)" }}
    >
      <div className="font-mono" style={{ color: "var(--text)", fontSize: 13 }}>
        <span style={{ color: "var(--accent)" }}>$</span> {INSTALL_CMD}
      </div>
      <div
        className="text-right font-mono uppercase"
        style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", lineHeight: 2 }}
      >
        <div style={{ color: "var(--accent)", fontWeight: 500 }}>{t("home.forever_free")}</div>
        <div className="space-x-1">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
            style={{ color: "var(--muted)" }}
          >
            GitHub
          </a>
          <span>·</span>
          <a href="#" className="hover:underline" style={{ color: "var(--muted)" }}>
            {t("home.footer.docs")}
          </a>
          <span>·</span>
          <a href="#" className="hover:underline" style={{ color: "var(--muted)" }}>
            {t("home.footer.manifesto")}
          </a>
        </div>
      </div>
    </footer>
  );
}
