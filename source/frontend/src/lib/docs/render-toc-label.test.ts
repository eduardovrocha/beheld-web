import { describe, test, expect } from "vitest";
import { renderTocLabel } from "./render-toc-label";

describe("renderTocLabel", () => {
  test("'beheld (sem subcomando)' vira <code>beheld</code> + hint", () => {
    const result = renderTocLabel("beheld (sem subcomando)");
    expect(result).toBe(
      '<code>beheld</code> <span class="toc__hint">sem subcomando</span>',
    );
  });

  test("'beheld init' vira <code>init</code> (strip do prefixo)", () => {
    expect(renderTocLabel("beheld init")).toBe("<code>init</code>");
  });

  test("'beheld harness install' vira <code>harness install</code>", () => {
    expect(renderTocLabel("beheld harness install")).toBe(
      "<code>harness install</code>",
    );
  });

  test("strip de placeholders [opcional]", () => {
    expect(renderTocLabel("beheld import [url]")).toBe(
      "<code>import</code>",
    );
  });

  test("strip de placeholders <required>", () => {
    expect(renderTocLabel("beheld verify <file>")).toBe(
      "<code>verify</code>",
    );
  });

  test("strip combinado de [...] e <...>", () => {
    expect(renderTocLabel("beheld snapshot list [--filter <type>]")).toBe(
      "<code>snapshot list</code>",
    );
  });

  test("texto sem 'beheld' fica em <code> diretamente", () => {
    expect(renderTocLabel("Sumário")).toBe("Sumário");
  });

  test("escapa HTML em títulos arbitrários", () => {
    expect(renderTocLabel("foo & bar")).toBe("foo &amp; bar");
  });

  test("colapsa espaços múltiplos após strip", () => {
    expect(renderTocLabel("beheld delete [--local] [--remote]")).toBe(
      "<code>delete</code>",
    );
  });

  test("backticks no input são strippados", () => {
    expect(renderTocLabel("`beheld init`")).toBe("<code>init</code>");
  });
});
