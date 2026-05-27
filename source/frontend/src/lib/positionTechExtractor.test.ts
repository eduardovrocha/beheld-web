import { describe, it, expect } from "vitest";

import { extractTechnologies } from "./positionTechExtractor";

describe("extractTechnologies", () => {
  it("retorna lista vazia para entrada vazia", () => {
    expect(extractTechnologies("").technologies).toEqual([]);
    expect(extractTechnologies("").matchCount).toBe(0);
  });

  it("detecta nomes canônicos básicos preservando ordem do texto", () => {
    const md = "Buscamos pessoa com experiência em Python, depois React e por fim AWS.";
    const r = extractTechnologies(md);
    expect(r.technologies).toEqual(["Python", "React", "AWS"]);
    expect(r.matchCount).toBeGreaterThanOrEqual(3);
  });

  it("é case-insensitive e reconhece aliases", () => {
    const md = "Stack: react, postgres, k8s. Bonus: ts.";
    expect(extractTechnologies(md).technologies).toEqual([
      "React", "PostgreSQL", "Kubernetes", "TypeScript",
    ]);
  });

  it("deduplica menções repetidas mas conta todas em matchCount", () => {
    const md = "React, react, React Native, REACT.";
    const r = extractTechnologies(md);
    // React aparece 3x + React Native 1x — canonicais únicos
    expect(r.technologies).toEqual(["React", "React Native"]);
    expect(r.matchCount).toBeGreaterThanOrEqual(4);
  });

  it("lida com símbolos especiais (C++, C#, .NET, Next.js)", () => {
    const md = "Procuramos devs com C++, C#, .NET e Next.js.";
    expect(extractTechnologies(md).technologies).toEqual(["C++", "C#", ".NET", "Next.js"]);
  });

  it("não casa palavras-substring (e.g. 'rust' dentro de 'trust')", () => {
    const md = "We trust no one. Discuss freely.";
    expect(extractTechnologies(md).technologies).toEqual([]);
  });

  it("ignora 'go' como palavra solta — só pega 'golang' para reduzir ruído", () => {
    expect(extractTechnologies("we have to go now").technologies).toEqual([]);
    expect(extractTechnologies("backend em golang").technologies).toEqual(["Go"]);
  });

  it("extrai de texto realista de descrição de vaga", () => {
    const md = `
      ## Engenheiro Backend Sênior

      Procuramos uma pessoa para evoluir nossa stack baseada em **Ruby on Rails**,
      PostgreSQL e Sidekiq, com toque em **Kubernetes** para deploy.
      Bonus: experiência com React no frontend.

      Localização: Remoto · São Paulo
    `;
    const r = extractTechnologies(md);
    expect(r.technologies).toContain("Rails");
    expect(r.technologies).toContain("PostgreSQL");
    expect(r.technologies).toContain("Sidekiq");
    expect(r.technologies).toContain("Kubernetes");
    expect(r.technologies).toContain("React");
  });
});
