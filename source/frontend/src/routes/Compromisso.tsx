import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import enMd from "@/content/COMPROMISSO.en.md?raw";
import esMd from "@/content/COMPROMISSO.es.md?raw";
import ptMd from "@/content/COMPROMISSO.md?raw";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/dict";

const DOCS: Record<Locale, string> = { pt: ptMd, en: enMd, es: esMd };

const META: Record<Locale, { title: string; desc: string }> = {
  pt: {
    title: "compromisso · forever free for developers — Beheld",
    desc: "o Beheld é de graça pra desenvolvedor. era no primeiro dia, é hoje, e segue sendo enquanto o projeto existir.",
  },
  en: {
    title: "compromisso · forever free for developers — Beheld",
    desc: "Beheld is free for developers. it was free on day one, it's free today, and it stays free for as long as the project exists.",
  },
  es: {
    title: "compromisso · forever free for developers — Beheld",
    desc: "Beheld es gratis para desarrolladores. lo era el primer día, lo es hoy, y sigue siéndolo mientras el proyecto exista.",
  },
};

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

export function Compromisso() {
  const { locale } = useI18n();
  const md = DOCS[locale];
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
    <div className="compromisso-page">
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <div className="pt-16">
          <SiteHeader />
        </div>
      </div>
      <article
        className="compromisso-article mx-auto"
        style={{ maxWidth: 1032, padding: "8px 32px 32px" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </article>
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <SiteFooter />
      </div>
    </div>
  );
}
