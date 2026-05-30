import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { MeetB3 } from "./MeetB3";
import { I18nProvider } from "@/i18n/I18nProvider";

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
        <MeetB3 />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("MeetB3", () => {
  beforeEach(() => {
    useLocale("pt");
  });

  it("monta sem erro e mostra a lente (mascote) no hero", () => {
    const { container } = setup();
    // LensLogo é o único SVG com aria-label "Beheld lens logo"
    const lens = container.querySelector('svg[aria-label="Beheld lens logo"]');
    expect(lens).not.toBeNull();
  });

  it("renderiza os 3 SectionHead numerados (01-03)", () => {
    setup();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renderiza o hero em primeira pessoa em PT", () => {
    setup();
    expect(
      screen.getByText(/Me chame de B3\. Eu vivo na sua máquina e presto atenção/i),
    ).toBeInTheDocument();
  });

  it("revelação do nome (B3H31D → behold) está no bloco 01", () => {
    setup();
    expect(
      screen.getByText(/B-3-H-3-1-D\. Leia de novo, devagar: behold/i),
    ).toBeInTheDocument();
  });

  it("bloco 03 explica por que B3 tem rosto — 'uma lente, não um logo'", () => {
    setup();
    expect(
      screen.getByText(/eu tenho uma lente, não um logo: a lente é o que vê/i),
    ).toBeInTheDocument();
  });

  it("letter em primeira pessoa, assinada — B3H31D", () => {
    setup();
    const letter = screen.getByText(/Você vai esquecer metade do que construiu este ano/i);
    const blockquote = letter.closest("blockquote");
    expect(blockquote).not.toBeNull();
    expect(within(blockquote as HTMLElement).getByText(/— B3H31D/)).toBeInTheDocument();
  });

  it("mostra 'forever free for developers' (b3.free) no CTA", () => {
    setup();
    expect(
      screen.getByText("Para sempre gratuito para desenvolvedores."),
    ).toBeInTheDocument();
  });

  it("nenhuma menção a IP de terceiros (R2D2/K-2SO/LEGO/Star Wars)", () => {
    const { container } = setup();
    const html = container.innerHTML;
    expect(html).not.toMatch(/R2D2|K-2SO|LEGO|Star Wars|Wars/i);
  });

  it("define document.title traduzido para a rota", () => {
    setup();
    expect(document.title).toBe("conheça o B3 · a testemunha · Beheld");
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
        screen.getByText(/Call me B3\. I live on your machine and I pay attention/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/B-3-H-3-1-D\. Read it again, slowly: behold/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Forever free for developers.")).toBeInTheDocument();
      expect(document.title).toBe("meet B3 · the witness · Beheld");
    });

    it("renderiza ES quando o locale é 'es'", async () => {
      useLocale("es");
      setup();
      expect(
        await screen.findByText(/Llámame B3\. Vivo en tu máquina y presto atención/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Para siempre gratis para desarrolladores."),
      ).toBeInTheDocument();
      expect(document.title).toBe("conoce a B3 · el testigo · Beheld");
    });
  });
});
