import { describe, test, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  test("converte texto simples para slug minúsculo com hífens", () => {
    expect(slugify("Beheld init")).toBe("beheld-init");
  });

  test("remove diacríticos via normalização NFD", () => {
    expect(slugify("Configuração geral")).toBe("configuracao-geral");
    expect(slugify("Pré-condições")).toBe("pre-condicoes");
  });

  test("remove backticks de identificadores em código", () => {
    expect(slugify("`beheld harness install`")).toBe("beheld-harness-install");
  });

  test("colapsa espaços múltiplos em um único hífen", () => {
    expect(slugify("beheld    init   wizard")).toBe("beheld-init-wizard");
  });

  test("colapsa hífens múltiplos em um único hífen", () => {
    expect(slugify("beheld - - init")).toBe("beheld-init");
  });

  test("strip caracteres especiais não-alfanuméricos", () => {
    expect(slugify("beheld!@#$%^&*()init")).toBe("beheldinit");
  });

  test("preserva números no slug", () => {
    expect(slugify("Fase 7 — Phase 4")).toBe("fase-7-phase-4");
  });

  test("retorna string vazia para entrada só com pontuação", () => {
    expect(slugify("...!!!???")).toBe("");
  });

  test("trunca para 80 caracteres no máximo", () => {
    const longInput = "a".repeat(200);
    const result = slugify(longInput);
    expect(result.length).toBe(80);
    expect(result).toBe("a".repeat(80));
  });

  test("trim de hífens/espaços nas pontas", () => {
    expect(slugify("  beheld init  ")).toBe("beheld-init");
    expect(slugify("---beheld init---")).toBe("beheld-init");
  });
});
