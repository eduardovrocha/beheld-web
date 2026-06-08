import { parse } from "node-html-parser";
import { slugify } from "./slugify";

export function addHeadingIds(html: string): string {
  const root = parse(html);
  const used = new Set<string>();

  root.querySelectorAll("h2, h3").forEach((h) => {
    const base = slugify(h.text);
    let id = base || "section";
    let counter = 2;
    while (used.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    used.add(id);

    h.setAttribute("id", id);
    h.insertAdjacentHTML(
      "beforeend",
      ` <a class="anchor" href="#${id}">#</a>`,
    );
  });

  return root.toString();
}
