// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocsSidebar } from "./DocsSidebar";
import type { TocGroup } from "@/lib/docs/build-toc";

const TOC: TocGroup[] = [
  { kind: "h2-only", id: "sumario", title: "Sumário", children: [] },
  {
    kind: "section",
    id: "comandos",
    title: "Comandos",
    children: [
      { id: "beheld-init", title: "beheld init" },
      { id: "beheld-start", title: "beheld start" },
      { id: "beheld-stop", title: "beheld stop" },
    ],
  },
];

afterEach(() => cleanup());

function linkById(id: string): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>(`a[data-id="${id}"]`);
}

describe("DocsSidebar", () => {
  test("renderiza trigger 'Documentação' e a árvore TOC", () => {
    render(<DocsSidebar toc={TOC} activeId={null} />);
    expect(screen.getByRole("button", { name: /documenta/i })).not.toBeNull();
    expect(linkById("sumario")).not.toBeNull();
    expect(linkById("comandos")).not.toBeNull();
  });

  test("começa expandido (is-open) por default", () => {
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const trigger = screen.getByRole("button", { name: /documenta/i });
    expect(trigger.className).toContain("is-open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test("clicar no trigger colapsa a árvore TOC", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const trigger = screen.getByRole("button", { name: /documenta/i });
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    const tree = document.getElementById("docsTree");
    expect(tree?.className).toContain("is-collapsed");
  });

  test("clicar de novo re-expande", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const trigger = screen.getByRole("button", { name: /documenta/i });
    await user.click(trigger);
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const tree = document.getElementById("docsTree");
    expect(tree?.className).not.toContain("is-collapsed");
  });

  test("filtra itens pelo input de busca", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const input = screen.getByPlaceholderText(/filtrar/i);
    await user.type(input, "init");

    expect(linkById("beheld-init")).not.toBeNull();
    expect(linkById("beheld-start")).toBeNull();
    expect(linkById("beheld-stop")).toBeNull();
  });

  test("filtro é case-insensitive", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const input = screen.getByPlaceholderText(/filtrar/i);
    await user.type(input, "INIT");
    expect(linkById("beheld-init")).not.toBeNull();
  });

  test("limpar o filtro mostra tudo de novo", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const input = screen.getByPlaceholderText(/filtrar/i) as HTMLInputElement;
    await user.type(input, "init");
    await user.clear(input);
    expect(linkById("beheld-start")).not.toBeNull();
    expect(linkById("beheld-stop")).not.toBeNull();
  });

  test("⌘K foca o input de busca", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const input = screen.getByPlaceholderText(/filtrar/i);
    expect(document.activeElement).not.toBe(input);
    await user.keyboard("{Meta>}k{/Meta}");
    expect(document.activeElement).toBe(input);
  });

  test("Ctrl+K também foca (não-Mac)", async () => {
    const user = userEvent.setup();
    render(<DocsSidebar toc={TOC} activeId={null} />);
    const input = screen.getByPlaceholderText(/filtrar/i);
    await user.keyboard("{Control>}k{/Control}");
    expect(document.activeElement).toBe(input);
  });

  test("item ativo recebe classe .active baseado em activeId", () => {
    render(<DocsSidebar toc={TOC} activeId="beheld-start" />);
    const active = linkById("beheld-start");
    expect(active?.className).toContain("active");
    const inactive = linkById("beheld-init");
    expect(inactive?.className ?? "").not.toContain("active");
  });

  test("renderiza grupos com label da seção", () => {
    render(<DocsSidebar toc={TOC} activeId={null} />);
    expect(linkById("comandos")?.textContent).toContain("Comandos");
  });
});
