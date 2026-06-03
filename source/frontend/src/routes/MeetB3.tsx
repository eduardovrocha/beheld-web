import { useEffect } from "react";

import { InstallCard } from "@/components/InstallCard";
import { SectionHead } from "@/components/SectionHead";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/i18n/I18nProvider";

const META = {
  pt: {
    title: "conheça o B3 · a testemunha · Beheld",
    desc: "Me chame de B3. Eu vivo na sua máquina e presto atenção. Não dou nota, não classifico, só registro o que vi.",
  },
  en: {
    title: "meet B3 · the witness · Beheld",
    desc: "Call me B3. I live on your machine and I pay attention. I don't grade, I don't classify, I just record what I saw.",
  },
  es: {
    title: "conoce a B3 · el testigo · Beheld",
    desc: "Llámame B3. Vivo en tu máquina y presto atención. No pongo nota, no clasifico, solo registro lo que vi.",
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

export function MeetB3() {
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
    <div className="b3-page">
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <div className="pt-16">
          <SiteHeader titleMain="B3" titleAccent="H31D" />
        </div>
      </div>

      <main className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <p
          className="mb-12 font-mono uppercase text-center"
          style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em", fontWeight: 500 }}
        >
          {t("b3.hero")}
        </p>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="01" title={t("b3.01.label")} right={t("b3.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("b3.01.body")}
          </p>
        </section>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="02" title={t("b3.02.label")} right={t("b3.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("b3.02.body")}
          </p>
        </section>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <SectionHead num="03" title={t("b3.03.label")} right={t("b3.right")} />
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.95, maxWidth: 720 }}>
            {t("b3.03.body")}
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
          {t("b3.letter")}
          <footer
            className="mt-4 font-mono uppercase"
            style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
          >
            B3H31D
          </footer>
        </blockquote>

        <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
          <div
            className="mb-4"
            style={{ color: "var(--text)", fontSize: 17, lineHeight: 1.65 }}
          >
            {t("b3.cta")}
          </div>
          <div className="mb-5">
            <InstallCard />
          </div>
          <div
            className="font-mono uppercase"
            style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
          >
            {t("b3.free")}
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
