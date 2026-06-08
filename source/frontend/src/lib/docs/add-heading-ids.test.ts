import { describe, test, expect } from "vitest";
import { addHeadingIds } from "./add-heading-ids";

describe("addHeadingIds", () => {
  test("adiciona id a h2 baseado no slug do texto", () => {
    const html = "<h2>Sumário</h2>";
    const result = addHeadingIds(html);
    expect(result).toContain('id="sumario"');
  });

  test("adiciona id a h3 baseado no slug do texto", () => {
    const html = "<h3>beheld init</h3>";
    const result = addHeadingIds(html);
    expect(result).toContain('id="beheld-init"');
  });

  test("não adiciona id a h1 ou h4", () => {
    const html = "<h1>Título</h1><h4>Flags</h4>";
    const result = addHeadingIds(html);
    expect(result).not.toContain('id="titulo"');
    expect(result).not.toContain('id="flags"');
  });

  test("deduplica via sufixo -2, -3 em colisões", () => {
    const html = "<h2>Notas</h2><h2>Notas</h2><h2>Notas</h2>";
    const result = addHeadingIds(html);
    expect(result).toContain('id="notas"');
    expect(result).toContain('id="notas-2"');
    expect(result).toContain('id="notas-3"');
  });

  test("anexa <a class='anchor'> ao heading", () => {
    const html = "<h2>Sumário</h2>";
    const result = addHeadingIds(html);
    expect(result).toContain('<a class="anchor" href="#sumario">#</a>');
  });

  test("desconsidera código wrapper no slug", () => {
    const html = "<h3><code>beheld init</code></h3>";
    const result = addHeadingIds(html);
    expect(result).toContain('id="beheld-init"');
  });

  test("preserva h2 e h3 em sequência misturada", () => {
    const html =
      "<h2>Comandos</h2><h3>beheld init</h3><h3>beheld start</h3>";
    const result = addHeadingIds(html);
    expect(result).toContain('id="comandos"');
    expect(result).toContain('id="beheld-init"');
    expect(result).toContain('id="beheld-start"');
  });
});
