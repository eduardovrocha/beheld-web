import { describe, test, expect } from "vitest";
import { parseMarkdown } from "./markdown";

const SAMPLE_MD = `# Beheld — Referência do CLI

> Fonte: \`packages/cli/src/\` (commit \`d41f476\` · 2026-06-08)
> Documento gerado por varredura.

## Sumário

texto

## Comandos

### \`beheld init\`

**Assinatura:** \`beheld init [--force]\`

**Flags**

| Flag | Default |
|---|---|
| \`--force\` | false |

**Execução.**

\`\`\`
  ▎ beheld  init
  ✓ tudo ok
\`\`\`

**Exit codes.** \`0\` em sucesso.
`;

describe("parseMarkdown", () => {
  test("extrai o título do primeiro h1", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.title).toBe("Beheld — Referência do CLI");
  });

  test("extrai o subtítulo do primeiro blockquote (sem markdown markers)", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.subtitle).toContain("Fonte:");
    expect(result.subtitle).not.toContain("**");
    expect(result.subtitle).not.toContain("`");
  });

  test("html contém h2 com id slugificado", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.html).toContain('id="sumario"');
    expect(result.html).toContain('id="comandos"');
  });

  test("html contém h3 com id slugificado", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.html).toContain('id="beheld-init"');
  });

  test("**Flags** vira <h4>", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.html).toContain("<h4>Flags</h4>");
  });

  test("**Execução.** vira <h4>Execução</h4> (sem ponto final)", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.html).toContain("<h4>Execução</h4>");
  });

  test("pre block recebe coloração inline (▎ → hl, ✓ → ok)", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.html).toContain('<span class="hl">');
    expect(result.html).toContain('<span class="ok">');
  });

  test("anchor <a class='anchor'> aparece em cada h2/h3", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.html).toMatch(
      /<h2 id="sumario">[^<]*<a class="anchor" href="#sumario">#<\/a><\/h2>/,
    );
  });

  test("toc estrutura agrupa h3 sob h2 anterior", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.toc.length).toBeGreaterThanOrEqual(2);
    const comandos = result.toc.find((g) => g.id === "comandos");
    expect(comandos).toBeDefined();
    expect(comandos?.children.length).toBeGreaterThanOrEqual(1);
    expect(comandos?.children[0].id).toBe("beheld-init");
  });

  test("toc preserva ordem dos headings no documento", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.toc[0].id).toBe("sumario");
    expect(result.toc[1].id).toBe("comandos");
  });

  test("sanitização remove tags perigosas como <script>", () => {
    const malicious = "# Olá\n\n<script>alert('xss')</script>\n\nTexto.";
    const result = parseMarkdown(malicious);
    expect(result.html).not.toContain("<script>");
  });

  test("retorna toc vazio quando markdown não tem h2/h3", () => {
    const md = "# Apenas título\n\nparágrafo de texto.";
    const result = parseMarkdown(md);
    expect(result.toc).toEqual([]);
  });

  test("tabelas GFM são renderizadas como <table>", () => {
    const result = parseMarkdown(SAMPLE_MD);
    expect(result.html).toContain("<table>");
    expect(result.html).toContain("<th>Flag</th>");
  });
});
