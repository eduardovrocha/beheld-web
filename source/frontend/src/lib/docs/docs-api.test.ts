import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  listCliVersions,
  fetchCliDoc,
  fetchBinaryVersion,
} from "./docs-api";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(responses: Array<Response | (() => Response)>) {
  let i = 0;
  globalThis.fetch = vi.fn(async () => {
    const r = responses[i++] ?? responses[responses.length - 1];
    return typeof r === "function" ? r() : r;
  }) as typeof fetch;
}

describe("docs-api", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  describe("listCliVersions", () => {
    test("retorna o array de versões em sucesso", async () => {
      mockFetch([
        new Response(
          JSON.stringify([
            { version: "0.4.1", commit_sha: "d41f476", published_at: "2026-06-08T00:00:00Z", tag: "latest" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ]);
      const result = await listCliVersions();
      expect(result.kind).toBe("ok");
      if (result.kind === "ok") {
        expect(result.versions).toHaveLength(1);
        expect(result.versions[0].version).toBe("0.4.1");
      }
    });

    test("retorna erro em 500", async () => {
      mockFetch([new Response("upstream", { status: 500 })]);
      const result = await listCliVersions();
      expect(result.kind).toBe("error");
      if (result.kind === "error") {
        expect(result.status).toBe(500);
      }
    });

    test("usa VITE_API_URL como base", async () => {
      vi.stubEnv("VITE_API_URL", "https://api.beheld.dev");
      const spy = vi.fn(
        async () =>
          new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
      );
      globalThis.fetch = spy as typeof fetch;

      await listCliVersions();

      expect(spy).toHaveBeenCalledTimes(1);
      const calls = spy.mock.calls as unknown as Array<unknown[]>;
      const url = String(calls[0]?.[0] ?? "");
      expect(url).toBe("https://api.beheld.dev/api/v1/docs/cli/versions");
    });

    test("erro de rede vira kind:error sem lançar", async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch;
      const result = await listCliVersions();
      expect(result.kind).toBe("error");
    });
  });

  describe("fetchCliDoc", () => {
    test("retorna o markdown em sucesso", async () => {
      mockFetch([
        new Response("# CLI\n\ntexto", {
          status: 200,
          headers: { "content-type": "text/markdown" },
        }),
      ]);
      const result = await fetchCliDoc("0.4.1");
      expect(result.kind).toBe("ok");
      if (result.kind === "ok") {
        expect(result.markdown).toContain("# CLI");
      }
    });

    test("retorna erro 404 quando versão não existe", async () => {
      mockFetch([
        new Response(JSON.stringify({ error: "version_not_found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ]);
      const result = await fetchCliDoc("0.99.0");
      expect(result.kind).toBe("error");
      if (result.kind === "error") {
        expect(result.status).toBe(404);
      }
    });

    test("monta URL com a versão informada", async () => {
      const spy = vi.fn(
        async () => new Response("md", { status: 200 }),
      );
      globalThis.fetch = spy as typeof fetch;
      await fetchCliDoc("0.4.1");
      const calls = spy.mock.calls as unknown as Array<unknown[]>;
      const url = String(calls[0]?.[0] ?? "");
      expect(url).toContain("/api/v1/docs/cli/0.4.1");
    });
  });

  describe("fetchBinaryVersion", () => {
    test("retorna a versão exposta pelo Rails", async () => {
      mockFetch([
        new Response(JSON.stringify({ version: "0.4.1", commit: "d41f476" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ]);
      const result = await fetchBinaryVersion();
      expect(result.kind).toBe("ok");
      if (result.kind === "ok") {
        expect(result.version).toBe("0.4.1");
      }
    });

    test("kind:error quando Rails está down", async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch;
      const result = await fetchBinaryVersion();
      expect(result.kind).toBe("error");
    });
  });
});
