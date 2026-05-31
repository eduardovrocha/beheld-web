import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { InstallCounter } from "./InstallCounter";
import { I18nProvider } from "@/i18n/I18nProvider";

function setLocale(loc: "pt" | "en" | "es") {
  try {
    localStorage.setItem("dp-locale", loc);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = loc === "pt" ? "pt-BR" : loc;
}

function setup() {
  return render(
    <I18nProvider>
      <InstallCounter />
    </I18nProvider>,
  );
}

const originalFetch = global.fetch;

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
});

describe("InstallCounter", () => {
  it("renderiza a linha com count formatado quando API responde 200", async () => {
    setLocale("en");
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ count: 1847 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as never;

    setup();

    await waitFor(() => {
      expect(screen.getByText(/I'm in/)).toBeInTheDocument();
    });
    // Formato com separador local (en-US usa vírgula).
    expect(screen.getByText(/1,847/)).toBeInTheDocument();
  });

  it("usa PT-BR quando locale é pt", async () => {
    setLocale("pt");
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ count: 1847 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as never;

    setup();

    await waitFor(() => {
      expect(screen.getByText(/estou em/i)).toBeInTheDocument();
    });
    // pt-BR usa ponto como separador de milhar.
    expect(screen.getByText(/1\.847/)).toBeInTheDocument();
  });

  it("usa ES quando locale é es", async () => {
    setLocale("es");
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ count: 42 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as never;

    setup();

    await waitFor(() => {
      expect(screen.getByText(/estoy en/i)).toBeInTheDocument();
    });
  });

  it("NÃO renderiza quando API retorna 500", async () => {
    setLocale("en");
    global.fetch = vi.fn(async () =>
      new Response("", { status: 500 }),
    ) as never;

    const { container } = setup();

    // Espera o useEffect resolver. Componente deve ficar vazio.
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });

  it("NÃO renderiza quando fetch faz throw (rede caída)", async () => {
    setLocale("en");
    global.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as never;

    const { container } = setup();
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });

  it("NÃO renderiza quando payload não tem count numérico", async () => {
    setLocale("en");
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ wrong: "shape" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as never;

    const { container } = setup();
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });

  it("NÃO renderiza quando count é negativo (defensive coercion)", async () => {
    setLocale("en");
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ count: -5 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as never;

    const { container } = setup();
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });
});
