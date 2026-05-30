import { useEffect, useState } from "react";

import { SectionHead } from "@/components/SectionHead";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/i18n/I18nProvider";

const INSTALL_CMD = "curl -fsSL beheld.dev/install.sh | sh";

function SessionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="grid items-baseline gap-2 py-2.5 sm:gap-4"
      style={{
        gridTemplateColumns: "minmax(110px, 180px) 1fr",
        borderBottom: "1px solid var(--rule-soft)",
      }}
    >
      <div
        className="font-mono uppercase"
        style={{ color: "var(--muted)", fontSize: 10.5, letterSpacing: "0.14em" }}
      >
        {label}
      </div>
      <div className="font-mono" style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

function SessionCard() {
  const t = useT();
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <span
          className="font-mono uppercase"
          style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.18em" }}
        >
          {t("rs.02.example")}
        </span>
      </div>
      <div className="px-5 py-3">
        <SessionRow label={t("rs.card.project")} value="[proj:a3f8c1d2]" />
        <SessionRow label={t("rs.card.duration")} value={t("rs.card.value.duration")} />
        <SessionRow
          label={t("rs.card.tools")}
          value="read_file · write_file · run_command · edit"
        />
        <SessionRow label={t("rs.card.test")} value={t("rs.card.value.test")} />
        <SessionRow label={t("rs.card.ecosystem")} value="rails" />
        <SessionRow label={t("rs.card.pattern")} value="TDD-first" />
      </div>
      <div
        className="px-5 py-3.5"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <span
          style={{
            color: "var(--accent)",
            fontSize: 13,
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          “{t("rs.02.caption")}”
        </span>
      </div>
    </div>
  );
}

function InstallCard() {
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
      style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
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
          className={`ml-auto cursor-pointer font-mono transition-colors ${copied ? "" : "uppercase"}`}
          style={{
            border: `1px solid ${copied ? "var(--ok)" : "var(--rule)"}`,
            color: copied ? "var(--ok)" : "var(--muted)",
            padding: "5px 11px",
            fontSize: 10,
            letterSpacing: "0.14em",
            background: "transparent",
          }}
        >
          {copied ? t("home.install.copied") : t("home.install.copy")}
        </button>
      </div>
    </div>
  );
}

const META = {
  pt: {
    title: "sessões reais · matéria-prima L2 · Beheld",
    desc: "Cada vez que você trabalha com o Claude Code, acontece uma sessão. O B3H31D registra o que dá pra observar nela — e nada do que está dentro do seu código.",
  },
  en: {
    title: "real sessions · raw L2 signal · Beheld",
    desc: "Every time you work with Claude Code, there's a session. B3H31D records what can be observed in it — and nothing of what's inside your code.",
  },
  es: {
    title: "sesiones reales · materia prima L2 · Beheld",
    desc: "Cada vez que trabajas con Claude Code, sucede una sesión. El B3H31D registra lo que se puede observar en ella — y nada de lo que está dentro de tu código.",
  },
} as const;

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

export function RealSessions() {
  const t = useT();
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "pt-BR";
  const locale = (lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "pt") as keyof typeof META;
  const meta = META[locale];

  useEffect(() => {
    const prevTitle = document.title;
    document.title = meta.title;
    const created: HTMLMetaElement[] = [];
    const pairs: Array<[string, string, "name" | "property"]> = [
      ["description", meta.desc, "name"],
      ["og:title", meta.title, "property"],
      ["og:description", meta.desc, "property"],
      ["og:type", "article", "property"],
    ];
    for (const [n, c, a] of pairs) {
      const existed = !!document.head.querySelector(`meta[${a}="${n}"]`);
      const el = setMeta(n, c, a);
      if (!existed) created.push(el);
    }
    return () => {
      document.title = prevTitle;
      created.forEach((el) => el.remove());
    };
  }, [meta.title, meta.desc]);

  return (
    <div className="rs-page">
      <div
        className="mx-auto mb-12 pb-14 pt-16"
        style={{ maxWidth: 1032, padding: "64px 32px 56px", borderBottom: "1px solid var(--rule)" }}
      >
        <SiteHeader />
      </div>

      <main className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <p
          className="mb-16"
          style={{
            color: "var(--text)",
            fontSize: 17,
            lineHeight: 1.7,
            letterSpacing: "-0.005em",
            maxWidth: 720,
          }}
        >
          {t("rs.hero")}
        </p>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="01" title={t("rs.01.label")} right={t("rs.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("rs.01.body")}
          </p>
        </section>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="02" title={t("rs.02.label")} right={t("rs.right")} />
          <p
            className="mb-8"
            style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}
          >
            {t("rs.02.body")}
          </p>
          <div style={{ maxWidth: 640 }}>
            <SessionCard />
          </div>
        </section>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="03" title={t("rs.03.label")} right={t("rs.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("rs.03.body")}
          </p>
        </section>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="04" title={t("rs.04.label")} right={t("rs.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("rs.04.body")}
          </p>
        </section>

        <blockquote
          className="my-16 py-2 pl-6"
          style={{
            borderLeft: "2px solid var(--accent)",
            color: "var(--text)",
            fontSize: 15,
            lineHeight: 1.95,
            maxWidth: 720,
          }}
        >
          {t("rs.letter")}
          <footer
            className="mt-4 font-mono uppercase"
            style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
          >
            — B3H31D
          </footer>
        </blockquote>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <div
            className="mb-4"
            style={{ color: "var(--text)", fontSize: 17, lineHeight: 1.65 }}
          >
            {t("rs.cta")}
          </div>
          <div className="mb-5">
            <InstallCard />
          </div>
          <div
            className="font-mono uppercase"
            style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
          >
            {t("rs.free")}
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
