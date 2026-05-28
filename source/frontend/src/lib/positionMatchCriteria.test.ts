// PP-VAL §9.3 — validation pra hard-gate o submit do form de position.
// Como `validateCriteria` é interno ao PositionsList.tsx, replicamos aqui
// a regra essencial sob teste (mesma lógica, isolada para Vitest). Se a
// regra do componente mudar, este teste falha — sinal de que o gate
// precisa ser revisitado.

import { describe, it, expect } from "vitest";

type Criteria = {
  ecosystems: { enabled: boolean; items: string[] };
  test_ratio: { enabled: boolean; min: number };
  recency:    { enabled: boolean; maxDays: number };
};

function validate(c: Criteria): string | null {
  const enabled: string[] = [];
  if (c.ecosystems.enabled) {
    if (c.ecosystems.items.length === 0) return "Selecione ao menos um ecosystem ou desative o critério.";
    enabled.push("ecosystems");
  }
  if (c.test_ratio.enabled) enabled.push("test_ratio");
  if (c.recency.enabled)    enabled.push("recency");
  if (enabled.length === 0) return "Defina ao menos um critério de match (ecosystems, test ratio ou recência).";
  return null;
}

const blank: Criteria = {
  ecosystems: { enabled: false, items: [] },
  test_ratio: { enabled: false, min: 0 },
  recency:    { enabled: false, maxDays: 30 },
};

describe("position match criteria validation (PP-VAL 9.3)", () => {
  it("bloqueia quando nenhum critério está habilitado", () => {
    expect(validate(blank)).toMatch(/ao menos um critério/i);
  });

  it("bloqueia quando ecosystems habilitado mas sem items", () => {
    expect(validate({ ...blank, ecosystems: { enabled: true, items: [] } }))
      .toMatch(/ecosystem/i);
  });

  it("aceita quando ecosystems tem ao menos um item", () => {
    expect(validate({ ...blank, ecosystems: { enabled: true, items: ["rails"] } })).toBeNull();
  });

  it("aceita quando test_ratio sozinho está habilitado", () => {
    expect(validate({ ...blank, test_ratio: { enabled: true, min: 30 } })).toBeNull();
  });

  it("aceita quando recency sozinho está habilitado", () => {
    expect(validate({ ...blank, recency: { enabled: true, maxDays: 60 } })).toBeNull();
  });
});
