import { useEffect } from "react";

import { InstallCard } from "@/components/InstallCard";
import { SectionHead } from "@/components/SectionHead";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/i18n/I18nProvider";

function DiagramBox({ label, port, children }: { label: string; port?: string; children?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center px-5 py-4 font-mono text-center"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        color: "var(--text)",
        fontSize: 12,
        minHeight: 64,
        flex: 1,
      }}
    >
      <div>
        <div>{label}</div>
        {port ? (
          <div className="mt-1" style={{ color: "var(--accent)", fontSize: 11 }}>
            {port}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function DiagramArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 font-mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
      {label ? <div className="mb-1 uppercase">{label}</div> : null}
      <div style={{ color: "var(--accent)", fontSize: 14 }}>→</div>
    </div>
  );
}

const META = {
  pt: {
    title: "como funciona · daemon local · Beheld",
    desc: "O B3H31D roda na sua máquina. Ele observa o que você faz com o Claude Code. Não julga.",
  },
  en: {
    title: "how it works · local daemon · Beheld",
    desc: "B3H31D runs on your machine. It watches how you work with Claude Code. It doesn't judge.",
  },
  es: {
    title: "cómo funciona · daemon local · Beheld",
    desc: "El B3H31D corre en tu máquina. Observa lo que haces con Claude Code. No juzga.",
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

export function HowItWorks() {
  const t = useT();
  // Resolve locale by reading <html lang> set by I18nProvider — keeps this route
  // pure-presentational without subscribing to context.
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
    <div className="hiw-page">
      <div
        className="mx-auto mb-12 pb-14 pt-16"
        style={{ maxWidth: 1032, padding: "64px 32px 56px", borderBottom: "1px solid var(--rule)" }}
      >
        <SiteHeader />
      </div>

      <main className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        {/* Hero opening line in B3H31D voice */}
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
          {t("hiw.hero")}
        </p>

        {/* 01 · what it watches */}
        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="01" title={t("hiw.01.label")} right={t("hiw.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("hiw.01.body")}
          </p>
        </section>

        {/* 02 · where it all lives */}
        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="02" title={t("hiw.02.label")} right={t("hiw.right")} />
          <p
            className="mb-8"
            style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}
          >
            {t("hiw.02.body")}
          </p>

          {/* Diagram */}
          <div className="mb-4 font-mono uppercase" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
            {t("hiw.02.diagram.source")}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            <DiagramBox label={t("hiw.02.diagram.mcp")} port=":7337" />
            <DiagramArrow label="JSONL" />
            <DiagramBox label={t("hiw.02.diagram.engine")} port=":7338" />
          </div>
          <div className="my-4 flex justify-center font-mono" style={{ color: "var(--accent)", fontSize: 14 }}>↓</div>
          <div
            className="px-5 py-4 text-center font-mono"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              color: "var(--text)",
              fontSize: 12,
            }}
          >
            {t("hiw.02.diagram.db")}
          </div>
          <div
            className="mt-4 text-center font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}
          >
            {t("hiw.02.diagram.footnote")}
          </div>
        </section>

        {/* 03 · what it never records */}
        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="03" title={t("hiw.03.label")} right={t("hiw.right")} />
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--rule)" }}>
                  <th
                    className="px-5 py-3 text-left font-mono uppercase"
                    style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", width: "38%" }}
                  >
                    {t("hiw.03.col.data")}
                  </th>
                  <th
                    className="px-5 py-3 text-left font-mono uppercase"
                    style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}
                  >
                    {t("hiw.03.col.action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["hiw.03.row.paths.label", "hiw.03.row.paths.action"],
                  ["hiw.03.row.cwd.label", "hiw.03.row.cwd.action"],
                  ["hiw.03.row.secrets.label", "hiw.03.row.secrets.action"],
                  ["hiw.03.row.code.label", "hiw.03.row.code.action"],
                ].map(([k, v], i, arr) => (
                  <tr key={k} style={{ borderBottom: i === arr.length - 1 ? undefined : "1px solid var(--rule-soft)" }}>
                    <td className="px-5 py-3.5" style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.65 }}>
                      {t(k)}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
                      {t(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 04 · always on */}
        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="04" title={t("hiw.04.label")} right={t("hiw.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("hiw.04.body")}
          </p>
        </section>

        {/* Letter */}
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
          {t("hiw.letter")}
          <footer
            className="mt-4 font-mono uppercase"
            style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
          >
            — B3H31D
          </footer>
        </blockquote>

        {/* CTA: install + forever free */}
        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <div
            className="mb-4"
            style={{ color: "var(--text)", fontSize: 17, lineHeight: 1.65 }}
          >
            {t("hiw.cta")}
          </div>
          <div className="mb-5">
            <InstallCard />
          </div>
          <div
            className="font-mono uppercase"
            style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
          >
            {t("hiw.free")}
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
