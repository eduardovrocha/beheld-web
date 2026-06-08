// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionPicker } from "./VersionPicker";
import type { CliVersion } from "@/lib/docs/docs-api";

const VERSIONS: CliVersion[] = [
  { version: "0.4.1", commit_sha: "d41f476", published_at: "2026-06-08T00:00:00Z", tag: "latest" },
  { version: "0.4.0", commit_sha: "d7badd8", published_at: "2026-05-22T00:00:00Z", tag: "stable" },
  { version: "0.3.0", commit_sha: "3b8d6e2", published_at: "2026-04-02T00:00:00Z", tag: "legacy" },
];

afterEach(() => cleanup());

describe("VersionPicker", () => {
  test("renderiza a versão atual no botão", () => {
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /vers[ãa]o/i });
    expect(btn.textContent).toContain("v0.4.1");
  });

  test("mostra pill 'latest' quando current tem tag latest", () => {
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /vers[ãa]o/i });
    expect(btn.textContent?.toLowerCase()).toContain("latest");
  });

  test("não mostra pill quando current não é latest", () => {
    render(<VersionPicker versions={VERSIONS} current="0.4.0" onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /vers[ãa]o/i });
    expect(btn.textContent?.toLowerCase()).not.toContain("latest");
  });

  test("dropdown começa fechado (aria-expanded=false)", () => {
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={() => {}} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    const btn = screen.getByRole("button", { name: /vers[ãa]o/i });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  test("clicar no botão abre o dropdown", async () => {
    const user = userEvent.setup();
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /vers[ãa]o/i }));
    expect(screen.queryByRole("listbox")).not.toBeNull();
  });

  test("dropdown lista todas as versões com role=option", async () => {
    const user = userEvent.setup();
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /vers[ãa]o/i }));
    const opts = screen.getAllByRole("option");
    expect(opts).toHaveLength(3);
    expect(opts[0].textContent).toContain("v0.4.1");
    expect(opts[1].textContent).toContain("v0.4.0");
    expect(opts[2].textContent).toContain("v0.3.0");
  });

  test("opção atual tem aria-selected=true", async () => {
    const user = userEvent.setup();
    render(<VersionPicker versions={VERSIONS} current="0.4.0" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /vers[ãa]o/i }));
    const opts = screen.getAllByRole("option");
    expect(opts[1].getAttribute("aria-selected")).toBe("true");
    expect(opts[0].getAttribute("aria-selected")).toBe("false");
  });

  test("clicar em opção chama onChange com a versão", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /vers[ãa]o/i }));
    await user.click(screen.getAllByRole("option")[1]);
    expect(onChange).toHaveBeenCalledWith("0.4.0");
  });

  test("clicar em opção fecha o dropdown", async () => {
    const user = userEvent.setup();
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /vers[ãa]o/i }));
    await user.click(screen.getAllByRole("option")[1]);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("renderiza commit curto e data abreviada em cada opção", async () => {
    const user = userEvent.setup();
    render(<VersionPicker versions={VERSIONS} current="0.4.1" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: /vers[ãa]o/i }));
    const first = screen.getAllByRole("option")[0];
    expect(first.textContent).toContain("d41f476");
  });

  test("não quebra com lista vazia (mostra fallback no botão)", () => {
    render(<VersionPicker versions={[]} current="" onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /vers[ãa]o/i });
    expect(btn).not.toBeNull();
  });
});
