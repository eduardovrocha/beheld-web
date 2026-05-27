import { describe, it, expect } from "vitest";

import { parsePositionMarkdown } from "./positionMarkdownParser";

describe("parsePositionMarkdown", () => {
  it("retorna estado vazio para string sem headings", () => {
    const r = parsePositionMarkdown("apenas texto solto, sem heading nenhum.");
    expect(r.sections).toEqual({});
    expect(r.matched).toEqual([]);
    expect(r.hadHeadings).toBe(false);
  });

  it("identifica as cinco seções pelos nomes em inglês", () => {
    const md = `
# Engenheiro Backend

## Responsibilities
- desenhar APIs
- code review

## Technical Stack
- Ruby on Rails
- PostgreSQL

## Requirements
- 3+ anos com Rails

## Qualifications
- experiência com produto B2B

## Nice to Have
- contribuições open source
`;
    const r = parsePositionMarkdown(md);
    expect(r.matched).toEqual([
      "responsibilities", "technical_stack", "requirements", "qualifications", "nice_to_have",
    ]);
    expect(r.sections.responsibilities).toContain("desenhar APIs");
    expect(r.sections.technical_stack).toContain("Ruby on Rails");
    expect(r.sections.requirements).toContain("3+ anos");
    expect(r.sections.qualifications).toContain("produto B2B");
    expect(r.sections.nice_to_have).toContain("open source");
    expect(r.hadHeadings).toBe(true);
  });

  it("identifica seções em português com acentos", () => {
    const md = `
## Responsabilidades
- liderar squad

## Stack Técnica
- Elixir + Phoenix

## Pré-requisitos
- comunicar bem

## Qualificações
- gestão de pessoas

## Diferenciais
- inglês fluente
`;
    const r = parsePositionMarkdown(md);
    expect(r.matched).toEqual([
      "responsibilities", "technical_stack", "requirements", "qualifications", "nice_to_have",
    ]);
    expect(r.sections.technical_stack).toContain("Phoenix");
    expect(r.sections.nice_to_have).toContain("inglês fluente");
  });

  it("aceita variações como 'Tech Stack', 'Must have', 'Bonus'", () => {
    const md = `
### Tech Stack
- Go

### Must have
- 5 anos

### Bonus
- AWS
`;
    const r = parsePositionMarkdown(md);
    expect(r.sections.technical_stack).toContain("Go");
    expect(r.sections.requirements).toContain("5 anos");
    expect(r.sections.nice_to_have).toContain("AWS");
  });

  it("descarta conteúdo antes do primeiro heading reconhecido", () => {
    const md = `
Resumo geral da vaga aqui — não deve ir pra nenhuma seção.

## Responsibilities
- gerenciar deploys
`;
    const r = parsePositionMarkdown(md);
    expect(r.sections.responsibilities).toContain("gerenciar deploys");
    // O resumo não deve vazar pra nenhuma seção
    expect(Object.values(r.sections).join(" ")).not.toContain("Resumo geral");
  });

  it("registra headings não reconhecidos em `unmatched` e não vaza conteúdo entre eles", () => {
    const md = `
## Sobre a Empresa
Texto bonito.

## Responsibilities
- coordenar reuniões

## Benefícios
- vale-refeição
`;
    const r = parsePositionMarkdown(md);
    expect(r.unmatched).toEqual(expect.arrayContaining(["Sobre a Empresa", "Benefícios"]));
    expect(r.sections.responsibilities).toContain("coordenar reuniões");
    expect(Object.values(r.sections).join(" ")).not.toContain("vale-refeição");
  });

  it("suporta headings com asteriscos de ênfase e sufixo `##`", () => {
    const md = `
## **Responsibilities** ##
- entregar features

### __Technical Stack__
- TypeScript
`;
    const r = parsePositionMarkdown(md);
    expect(r.sections.responsibilities).toContain("entregar features");
    expect(r.sections.technical_stack).toContain("TypeScript");
  });
});
