import { useEffect } from "react";

interface MarkdownArticleProps {
  html: string;
  hash: string | null;
  onActiveIdChange?: (id: string | null) => void;
}

export function MarkdownArticle({ html, hash, onActiveIdChange }: MarkdownArticleProps) {
  // Scroll para o hash quando o artigo monta ou o hash muda
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, html]);

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    if (!onActiveIdChange) return;

    const article = document.getElementById("art");
    if (!article) return;

    const targets = article.querySelectorAll<HTMLElement>("h2[id], h3[id]");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;
        onActiveIdChange(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [html, onActiveIdChange]);

  return (
    <article
      className="art"
      id="art"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
