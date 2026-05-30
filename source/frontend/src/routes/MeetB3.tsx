import { useEffect, useState } from "react";

import { LensLogo } from "@/components/LensLogo";
import { SectionHead } from "@/components/SectionHead";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/i18n/I18nProvider";

const INSTALL_CMD = "curl -fsSL beheld.dev/install.sh | sh";

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
    title: "conheça o B3 · a testemunha · Beheld",
    desc: "Me chame de B3. Eu vivo na sua máquina e presto atenção. Não dou nota, não classifico — só registro o que vi.",
  },
  en: {
    title: "meet B3 · the witness · Beheld",
    desc: "Call me B3. I live on your machine and I pay attention. I don't grade, I don't classify — I just record what I saw.",
  },
  es: {
    title: "conoce a B3 · el testigo · Beheld",
    desc: "Llámame B3. Vivo en tu máquina y presto atención. No pongo nota, no clasifico — solo registro lo que vi.",
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
      <div
        className="mx-auto pt-16"
        style={{ maxWidth: 1032, padding: "64px 32px 56px", borderBottom: "1px solid var(--rule)" }}
      >
        <SiteHeader />
      </div>
      <header
        className="b3-hero mx-auto pb-20 pt-20 text-center"
        style={{ maxWidth: 1032, padding: "80px 32px 80px", borderBottom: "1px solid var(--rule)" }}
      >
        <div className="mb-10 flex justify-center" style={{ color: "var(--accent)" }}>
          {/* The lens IS the B3 mascot — escalada como protagonista do hero. */}
          <LensLogo size={260} />
        </div>
        <h1
          className="font-semibold"
          style={{
            color: "var(--text)",
            fontSize: 56,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          B3<span style={{ color: "var(--accent)", fontWeight: 400 }}>H31D</span>
        </h1>
        <p
          className="mx-auto mt-8"
          style={{
            color: "var(--muted)",
            fontSize: 17,
            lineHeight: 1.6,
            letterSpacing: "-0.005em",
            maxWidth: 540,
          }}
        >
          {t("b3.hero")}
        </p>
      </header>

      <main className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
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
            — B3H31D
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
