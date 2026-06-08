import { describe, test, expect } from "vitest";
import { colorizePre } from "./colorize-pre";

describe("colorizePre", () => {
  describe("marcadores no início da linha viram spans com classe", () => {
    test("▎ → span.hl (linha inteira destacada)", () => {
      const html = "<pre>  ▎ beheld  bootstrap</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="hl">  ▎ beheld  bootstrap</span>');
    });

    test("✓ → span.ok (só o marcador)", () => {
      const html = "<pre>  ✓ MCP server iniciado</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="ok">✓</span>');
      expect(result).toContain("MCP server iniciado");
    });

    test("✗ → span.err", () => {
      const html = "<pre>  ✗ Engine offline</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="err">✗</span>');
    });

    test("⚠ → span.warn", () => {
      const html = "<pre>  ⚠ atenção</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="warn">⚠</span>');
    });

    test("! → span.warn (preserva indentação)", () => {
      const html = "<pre>  ! manual setup required</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="warn">!</span>');
    });

    test("→ → span.arrow", () => {
      const html = "<pre>  → https://github.com/...</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="arrow">→</span>');
    });

    test("• → span.arrow", () => {
      const html = "<pre>  • genesis snapshot</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="arrow">•</span>');
    });

    test("$ → span.pmt", () => {
      const html = "<pre>  $ beheld start</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="pmt">$</span>');
    });

    test("🔧 → span.warn linha inteira", () => {
      const html = "<pre>🔧 Auto-heal disparado</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="warn">🔧 Auto-heal disparado</span>');
    });

    test("linha só de divisores ──── → span.dim", () => {
      const html = "<pre>  ──────────────────</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="dim">  ──────────────────</span>');
    });
  });

  describe("escape HTML", () => {
    test("escapa < > & antes de aplicar spans", () => {
      const html = "<pre>  → beheld verify &lt;file&gt;</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="arrow">→</span>');
      expect(result).toContain("&lt;file&gt;");
      expect(result).not.toMatch(/<file>/);
    });

    test("escapa & em texto plano", () => {
      const html = "<pre>foo &amp; bar</pre>";
      const result = colorizePre(html);
      expect(result).toContain("foo &amp; bar");
    });
  });

  describe("linhas sem marcador permanecem intocadas (escapadas)", () => {
    test("linha de texto plano fica sem span", () => {
      const html = "<pre>texto normal sem marcador</pre>";
      const result = colorizePre(html);
      expect(result).toContain("texto normal sem marcador");
      expect(result).not.toContain('<span class="');
    });
  });

  describe("integração", () => {
    test("processa múltiplas linhas em um único <pre>", () => {
      const html = `<pre>  ▎ beheld  start
  ✓ MCP server iniciado
  ✗ Engine offline</pre>`;
      const result = colorizePre(html);
      expect(result).toContain('<span class="hl">');
      expect(result).toContain('<span class="ok">');
      expect(result).toContain('<span class="err">');
    });

    test("processa múltiplos <pre> no mesmo documento", () => {
      const html =
        "<pre>  ✓ ok</pre><p>texto</p><pre>  ✗ fail</pre>";
      const result = colorizePre(html);
      expect(result).toContain('<span class="ok">');
      expect(result).toContain('<span class="err">');
      expect(result).toContain("<p>texto</p>");
    });

    test("não altera elementos fora de <pre>", () => {
      const html = "<p>  ✓ esse não deve mudar</p><pre>  ✓ esse sim</pre>";
      const result = colorizePre(html);
      expect(result).toMatch(/<p>  ✓ esse não deve mudar<\/p>/);
      expect(result).toContain('<span class="ok">✓</span>');
    });
  });
});
