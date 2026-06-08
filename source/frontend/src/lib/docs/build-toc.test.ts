import { describe, test, expect } from "vitest";
import { buildToc } from "./build-toc";

describe("buildToc", () => {
  test("retorna array vazio quando não há headings", () => {
    const html = "<p>texto plano sem headings</p>";
    expect(buildToc(html)).toEqual([]);
  });

  test("h2 sem filhos vira grupo h2-only", () => {
    const html = '<h2 id="sumario">Sumário</h2>';
    expect(buildToc(html)).toEqual([
      { kind: "h2-only", id: "sumario", title: "Sumário", children: [] },
    ]);
  });

  test("h2 com h3 abaixo vira grupo section com filhos", () => {
    const html =
      '<h2 id="comandos">Comandos</h2>' +
      '<h3 id="beheld-init">beheld init</h3>' +
      '<h3 id="beheld-start">beheld start</h3>';
    expect(buildToc(html)).toEqual([
      {
        kind: "section",
        id: "comandos",
        title: "Comandos",
        children: [
          { id: "beheld-init", title: "beheld init" },
          { id: "beheld-start", title: "beheld start" },
        ],
      },
    ]);
  });

  test("h3 antes de qualquer h2 vai para o grupo Geral", () => {
    const html =
      '<h3 id="orphan">comando órfão</h3>' +
      '<h2 id="comandos">Comandos</h2>' +
      '<h3 id="beheld-init">beheld init</h3>';
    const result = buildToc(html);
    expect(result[0]).toEqual({
      kind: "section",
      id: "",
      title: "Geral",
      children: [{ id: "orphan", title: "comando órfão" }],
    });
    expect(result[1]).toEqual({
      kind: "section",
      id: "comandos",
      title: "Comandos",
      children: [{ id: "beheld-init", title: "beheld init" }],
    });
  });

  test("ignora anchors '#' no título do heading", () => {
    const html =
      '<h2 id="sumario">Sumário<a class="anchor" href="#sumario">#</a></h2>';
    const result = buildToc(html);
    expect(result[0].title).toBe("Sumário");
  });

  test("múltiplos h2 com e sem h3 são preservados na ordem", () => {
    const html =
      '<h2 id="sumario">Sumário</h2>' +
      '<h2 id="flags-globais">Flags globais</h2>' +
      '<h2 id="comandos">Comandos</h2>' +
      '<h3 id="beheld-init">beheld init</h3>';
    const result = buildToc(html);
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({
      kind: "h2-only",
      id: "sumario",
      title: "Sumário",
      children: [],
    });
    expect(result[1]).toEqual({
      kind: "h2-only",
      id: "flags-globais",
      title: "Flags globais",
      children: [],
    });
    expect(result[2].kind).toBe("section");
    expect(result[2].children.length).toBe(1);
  });

  test("ignora h4 (não entra no TOC)", () => {
    const html =
      '<h2 id="comandos">Comandos</h2>' +
      '<h3 id="beheld-init">beheld init</h3>' +
      "<h4>Flags</h4>";
    const result = buildToc(html);
    expect(result[0].children.length).toBe(1);
    expect(result[0].children[0].id).toBe("beheld-init");
  });

  test("preserva backticks no título (renderTocLabel cuida do display)", () => {
    const html =
      '<h2 id="comandos">Comandos</h2>' +
      '<h3 id="beheld-init"><code>beheld init</code></h3>';
    const result = buildToc(html);
    expect(result[0].children[0].title).toBe("beheld init");
  });
});
