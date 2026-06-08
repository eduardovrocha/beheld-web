import { parse, NodeType, type HTMLElement } from "node-html-parser";

const KNOWN_LABEL =
  /^(Flags|Argumentos|Execução|Resultado esperado|Exit codes|Notas|Pré-condições|Descrição)$/;

export function liftLabels(html: string): string {
  const root = parse(html);

  root.querySelectorAll("p").forEach((p) => {
    const significant = p.childNodes.filter((node) => {
      if (node.nodeType === NodeType.TEXT_NODE) {
        return node.text.trim().length > 0;
      }
      return true;
    });

    if (significant.length !== 1) return;

    const only = significant[0];
    if (only.nodeType !== NodeType.ELEMENT_NODE) return;

    const element = only as HTMLElement;
    if (element.tagName !== "STRONG") return;

    const cleaned = element.text.trim().replace(/[.:]\s*$/, "");
    if (!KNOWN_LABEL.test(cleaned)) return;

    p.replaceWith(`<h4>${cleaned}</h4>`);
  });

  return root.toString();
}
