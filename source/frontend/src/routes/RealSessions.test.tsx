import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { RealSessions } from "./RealSessions";
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
        <RealSessions />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("RealSessions", () => {
  beforeEach(() => {
    useLocale("pt");
  });

  it("monta sem erro e mostra os 4 SectionHead numerados", () => {
    setup();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
  });

  it("renderiza o hero na voz B3H31D em PT", () => {
    setup();
    expect(
      screen.getByText(/Cada vez que você trabalha com o Claude Code/i),
    ).toBeInTheDocument();
  });

  it("renderiza o card ilustrativo com badge 'exemplo · sessão observada'", () => {
    setup();
    expect(screen.getByText(/exemplo · sessão observada/i)).toBeInTheDocument();
  });

  it("card exibe os 6 campos derivados (sem texto livre/path)", () => {
    setup();
    // 6 row labels
    expect(screen.getByText(/^projeto$/i)).toBeInTheDocument();
    expect(screen.getByText(/^duração$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ferramentas$/i)).toBeInTheDocument();
    expect(screen.getByText(/^contexto de teste$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ecossistema$/i)).toBeInTheDocument();
    expect(screen.getByText(/^padrão observado$/i)).toBeInTheDocument();
    // values: project is the SHA-hash placeholder, duration and test localized
    expect(screen.getByText("[proj:a3f8c1d2]")).toBeInTheDocument();
    expect(screen.getByText("47 min · 23 turnos")).toBeInTheDocument();
    expect(screen.getByText("sim — rspec")).toBeInTheDocument();
    expect(screen.getByText("read_file · write_file · run_command · edit")).toBeInTheDocument();
    expect(screen.getByText("rails")).toBeInTheDocument();
    expect(screen.getByText("TDD-first")).toBeInTheDocument();
  });

  it("legenda-testemunha aparece como citação dentro do card", () => {
    setup();
    expect(
      screen.getByText(/Foi isso que eu vi\. Não classifiquei\. Registrei\./),
    ).toBeInTheDocument();
  });

  it("bloco 04 deixa explícito que a sessão individual nunca sai da máquina", () => {
    setup();
    expect(
      screen.getByText(/A sessão individual nunca sai da sua máquina/i),
    ).toBeInTheDocument();
  });

  it("mostra a letter assinada — B3H31D", () => {
    setup();
    const letter = screen.getByText(/Eu não te observo para te avaliar/i);
    const blockquote = letter.closest("blockquote");
    expect(blockquote).not.toBeNull();
    expect(within(blockquote as HTMLElement).getByText(/— B3H31D/)).toBeInTheDocument();
  });

  it("mostra 'forever free for developers' (rs.free) no CTA", () => {
    setup();
    // exact match avoids collision with home.forever_free
    expect(
      screen.getByText("Para sempre gratuito para desenvolvedores."),
    ).toBeInTheDocument();
  });

  it("define document.title traduzido para a rota", () => {
    setup();
    expect(document.title).toBe("sessões reais · matéria-prima L2 · Beheld");
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
        screen.getByText(/Every time you work with Claude Code, there's a session/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/example · observed session/i)).toBeInTheDocument();
      expect(screen.getByText("47 min · 23 turns")).toBeInTheDocument();
      expect(screen.getByText("yes — rspec")).toBeInTheDocument();
      expect(screen.getByText("Forever free for developers.")).toBeInTheDocument();
      expect(document.title).toBe("real sessions · raw L2 signal · Beheld");
    });

    it("renderiza ES quando o locale é 'es'", async () => {
      useLocale("es");
      setup();
      expect(
        await screen.findByText(/Cada vez que trabajas con Claude Code, sucede una sesión/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/ejemplo · sesión observada/i)).toBeInTheDocument();
      expect(screen.getByText("sí — rspec")).toBeInTheDocument();
      expect(
        screen.getByText("Para siempre gratis para desarrolladores."),
      ).toBeInTheDocument();
      expect(document.title).toBe("sesiones reales · materia prima L2 · Beheld");
    });
  });
});
