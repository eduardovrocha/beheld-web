import { describe, test, expect } from "vitest";
import { liftLabels } from "./lift-labels";

describe("liftLabels", () => {
  describe("labels reconhecidos viram <h4>", () => {
    const labels = [
      "Flags",
      "Argumentos",
      "Execução",
      "Resultado esperado",
      "Exit codes",
      "Notas",
      "Pré-condições",
      "Descrição",
    ];

    test.each(labels)("converte <p><strong>%s</strong></p> em <h4>", (label) => {
      const html = `<p><strong>${label}</strong></p>`;
      const result = liftLabels(html);
      expect(result).toContain(`<h4>${label}</h4>`);
      expect(result).not.toMatch(/<p[^>]*><strong>/);
    });
  });

  describe("variações de pontuação", () => {
    test("aceita label terminando em ponto", () => {
      const html = "<p><strong>Resultado esperado.</strong></p>";
      const result = liftLabels(html);
      expect(result).toContain("<h4>Resultado esperado</h4>");
    });

    test("aceita label terminando em dois-pontos", () => {
      const html = "<p><strong>Flags:</strong></p>";
      const result = liftLabels(html);
      expect(result).toContain("<h4>Flags</h4>");
    });
  });

  describe("casos negativos — NÃO viram <h4>", () => {
    test("parágrafo com <strong> mais texto adicional permanece <p>", () => {
      const html = "<p><strong>Flags</strong> e outras coisas</p>";
      const result = liftLabels(html);
      expect(result).not.toContain("<h4>");
      expect(result).toContain("<strong>Flags</strong>");
    });

    test("label não reconhecido permanece <p>", () => {
      const html = "<p><strong>Capítulo desconhecido</strong></p>";
      const result = liftLabels(html);
      expect(result).not.toContain("<h4>");
    });

    test("parágrafo sem <strong> permanece intocado", () => {
      const html = "<p>texto plano</p>";
      const result = liftLabels(html);
      expect(result).toContain("<p>texto plano</p>");
      expect(result).not.toContain("<h4>");
    });

    test("dois <strong> no mesmo parágrafo NÃO vira h4", () => {
      const html = "<p><strong>Flags</strong> <strong>Notas</strong></p>";
      const result = liftLabels(html);
      expect(result).not.toContain("<h4>");
    });
  });

  test("preserva o restante do documento intacto", () => {
    const html =
      "<h2>Bootstrap</h2><p>parágrafo normal</p><p><strong>Flags</strong></p><p>outro texto</p>";
    const result = liftLabels(html);
    expect(result).toContain("<h2>Bootstrap</h2>");
    expect(result).toContain("<p>parágrafo normal</p>");
    expect(result).toContain("<h4>Flags</h4>");
    expect(result).toContain("<p>outro texto</p>");
  });

  test("converte múltiplos labels no mesmo documento", () => {
    const html =
      "<p><strong>Flags</strong></p><p>tabela aqui</p><p><strong>Notas</strong></p>";
    const result = liftLabels(html);
    expect(result).toContain("<h4>Flags</h4>");
    expect(result).toContain("<h4>Notas</h4>");
  });
});
