import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { HowItWorks } from "./HowItWorks";
import { I18nProvider } from "@/i18n/I18nProvider";

// jsdom default navigator.language is "en-US"; force the I18nProvider into the
// requested locale via localStorage["dp-locale"] (read by detectInitialLocale).
function useLocale(loc: "pt" | "en" | "es") {
  try {
    localStorage.setItem("dp-locale", loc);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = loc === "pt" ? "pt-BR" : loc;
}

function setup() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <HowItWorks />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("HowItWorks", () => {
  beforeEach(() => {
    useLocale("pt"); // default for every test
  });

  it("monta sem erro e mostra os 4 SectionHead numerados", () => {
    setup();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
  });

  it("renderiza o hero na voz do B3H31D em PT", () => {
    setup();
    expect(
      screen.getByText(/O B3H31D roda na sua máquina\. Ele observa o que você faz/i),
    ).toBeInTheDocument();
  });

  it("renderiza o diagrama do bloco 02 com portas :7337 e :7338", () => {
    setup();
    expect(screen.getByText(":7337")).toBeInTheDocument();
    expect(screen.getByText(":7338")).toBeInTheDocument();
    // text matchers match ancestors too — assert "found at least once" instead
    // of uniqueness for substrings that bubble up the tree.
    expect(screen.getAllByText(/SQLite no seu disco/i).length).toBeGreaterThan(0);
    expect(screen.getByText("JSONL")).toBeInTheDocument();
  });

  it("renderiza a tabela de privacidade com 4 linhas e os 2 headers", () => {
    setup();
    const table = screen.getByRole("table");
    expect(within(table).getByText(/^o dado$/i)).toBeInTheDocument();
    expect(within(table).getByText(/o que o B3H31D faz/i)).toBeInTheDocument();
    expect(within(table).getByText(/Caminhos absolutos/i)).toBeInTheDocument();
    expect(within(table).getByText(/Diretório de trabalho \(cwd\)/i)).toBeInTheDocument();
    expect(within(table).getByText(/API keys \/ segredos/i)).toBeInTheDocument();
    expect(within(table).getByText(/Conteúdo do código/i)).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(5); // header + 4 rows
  });

  it("mostra a letter assinada — B3H31D", () => {
    setup();
    const letter = screen.getByText(/Eu não decido se você é bom/i);
    expect(letter).toBeInTheDocument();
    const blockquote = letter.closest("blockquote");
    expect(blockquote).not.toBeNull();
    expect(within(blockquote as HTMLElement).getByText(/— B3H31D/)).toBeInTheDocument();
  });

  it("mostra 'forever free for developers' (hiw.free) no CTA", () => {
    setup();
    // exact match avoids collision with the home.forever_free label rendered
    // elsewhere (different string: no terminal period, all lowercase source).
    expect(
      screen.getByText("Para sempre gratuito para desenvolvedores."),
    ).toBeInTheDocument();
  });

  it("define document.title traduzido para a rota", () => {
    setup();
    expect(document.title).toBe("como funciona · daemon local · Beheld");
  });

  it("nunca faz fetch — view é puramente apresentacional", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch called unexpectedly");
    });
    expect(() => setup()).not.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  describe("i18n", () => {
    it("renderiza EN quando o locale é 'en'", () => {
      useLocale("en");
      setup();
      expect(
        screen.getByText(/B3H31D runs on your machine\. It watches how you work/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Forever free for developers.")).toBeInTheDocument();
      expect(document.title).toBe("how it works · local daemon · Beheld");
    });

    it("renderiza ES quando o locale é 'es'", async () => {
      // es é code-split (dynamic import) — useEffect dispara loadLocale e
      // re-renderiza assim que o módulo chega. findByText espera o re-render.
      useLocale("es");
      setup();
      expect(
        await screen.findByText(/El B3H31D corre en tu máquina\. Observa lo que haces/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Para siempre gratis para desarrolladores."),
      ).toBeInTheDocument();
      expect(document.title).toBe("cómo funciona · daemon local · Beheld");
    });
  });
});
