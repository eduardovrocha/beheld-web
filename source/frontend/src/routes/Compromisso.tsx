import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import compromissoMd from "@/content/COMPROMISSO.md?raw";

const OG_TITLE = "compromisso · forever free for developers — beheld";
const OG_DESC =
  "o beheld é de graça pra desenvolvedor. era no primeiro dia, é hoje, e segue sendo enquanto o projeto existir.";

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
  useEffect(() => {
    const prevTitle = document.title;
    document.title = OG_TITLE;
    const created: HTMLMetaElement[] = [];
    const pairs: Array<[string, string, "name" | "property"]> = [
      ["description", OG_DESC, "name"],
      ["og:title", OG_TITLE, "property"],
      ["og:description", OG_DESC, "property"],
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
  }, []);

  return (
    <div className="compromisso-page">
      <div
        className="mx-auto mb-12 pb-14 pt-16"
        style={{ maxWidth: 1032, padding: "64px 32px 56px", borderBottom: "1px solid var(--rule)" }}
      >
        <SiteHeader />
      </div>
      <article
        className="compromisso-article mx-auto"
        style={{ maxWidth: 680, padding: "8px 32px 32px" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{compromissoMd}</ReactMarkdown>
      </article>
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <SiteFooter />
      </div>
    </div>
  );
}
