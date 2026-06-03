import { useEffect } from "react";

import { InstallCard } from "@/components/InstallCard";
import { SectionHead } from "@/components/SectionHead";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/i18n/I18nProvider";

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
            lineHeight: 1.5,
          }}
        >
          “{t("rs.02.caption")}”
        </span>
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
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <div className="pt-16">
          <SiteHeader />
        </div>
      </div>

      <main className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <p
          className="mb-12 font-mono uppercase text-center"
          style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em", fontWeight: 500 }}
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
          <SessionCard />
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
