import { describe, test, expect } from "vitest";
import { computeSyncStatus } from "./sync-status";

const DOC = (overrides = {}) => ({
  version: "0.4.1",
  commit_sha: "d41f476",
  ...overrides,
});

describe("computeSyncStatus", () => {
  describe("comparação por commit (prioritária)", () => {
    test("retorna 'in_sync' quando os commits batem exatamente", () => {
      expect(computeSyncStatus(DOC(), { version: "0.4.1", commit: "d41f476" }))
        .toBe("in_sync");
    });

    test("retorna 'in_sync' quando um commit é prefixo do outro (7 vs 12 chars)", () => {
      expect(
        computeSyncStatus(DOC({ commit_sha: "d41f476abcde" }), { version: "0.4.1", commit: "d41f476" }),
      ).toBe("in_sync");
      expect(
        computeSyncStatus(DOC(), { version: "0.4.1", commit: "d41f476abcde" }),
      ).toBe("in_sync");
    });

    test("'in_sync' é case-insensitive", () => {
      expect(
        computeSyncStatus(DOC({ commit_sha: "D41F476" }), { version: "0.4.1", commit: "d41f476" }),
      ).toBe("in_sync");
    });

    test("retorna 'out_of_sync' quando commits diferem", () => {
      expect(
        computeSyncStatus(DOC(), { version: "0.4.1", commit: "d7badd8" }),
      ).toBe("out_of_sync");
    });
  });

  describe("fallback para comparação por version (quando commit ausente)", () => {
    test("retorna 'in_sync' quando versions batem e commit do binário é undefined", () => {
      expect(
        computeSyncStatus(DOC(), { version: "0.4.1" }),
      ).toBe("in_sync");
    });

    test("retorna 'out_of_sync' quando versions diferem e commit do binário é undefined", () => {
      expect(
        computeSyncStatus(DOC(), { version: "0.4.0" }),
      ).toBe("out_of_sync");
    });
  });

  describe("'unknown' nos casos sem informação suficiente", () => {
    test("retorna 'unknown' quando binary é null/undefined", () => {
      expect(computeSyncStatus(DOC(), undefined)).toBe("unknown");
      expect(computeSyncStatus(DOC(), null)).toBe("unknown");
    });

    test("retorna 'unknown' quando doc commit_sha é vazio E binary não tem version", () => {
      expect(
        computeSyncStatus(DOC({ commit_sha: "" }), { version: "" }),
      ).toBe("unknown");
    });
  });
});
