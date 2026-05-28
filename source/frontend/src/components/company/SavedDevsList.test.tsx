import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { SavedDevsList } from "./SavedDevsList";
import type { SavedDev } from "@/lib/companyDashboardApi";

const dev = (over: Partial<SavedDev> = {}): SavedDev => ({
  account_id:    42,
  dev_handle:    "@alice",
  bundle_slug:   "abc123",
  bundle_status: "verified",
  note:          null,
  saved_at:      "2026-05-26T10:00:00Z",
  ...over,
});

function setup(savedDevs: SavedDev[], handlers: {
  onUpdateNote?: (id: number, note: string) => Promise<void> | void;
  onRemove?:     (id: number)               => Promise<void> | void;
} = {}) {
  const onUpdateNote = handlers.onUpdateNote ?? vi.fn();
  const onRemove     = handlers.onRemove     ?? vi.fn();
  render(
    <MemoryRouter>
      <SavedDevsList savedDevs={savedDevs} onUpdateNote={onUpdateNote} onRemove={onRemove} />
    </MemoryRouter>,
  );
  return { onUpdateNote, onRemove, user: userEvent.setup() };
}

describe("SavedDevsList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra estado vazio sem cards", () => {
    setup([]);
    expect(screen.getByText(/Nenhum dev salvo ainda/i)).toBeInTheDocument();
  });

  it("rotula o status do bundle em PT", () => {
    setup([dev({ bundle_status: "outdated" })]);
    expect(screen.getByLabelText(/desatualizado/i)).toBeInTheDocument();
  });

  it("permite editar e salvar a nota", async () => {
    const onUpdateNote = vi.fn().mockResolvedValue(undefined);
    const { user } = setup([dev()], { onUpdateNote });

    await user.click(screen.getByRole("button", { name: /editar nota/i }));
    const textarea = screen.getByPlaceholderText(/nota privada/i) as HTMLTextAreaElement;
    await user.type(textarea, "candidato forte em Go");
    await user.click(screen.getByRole("button", { name: /salvar nota/i }));

    expect(onUpdateNote).toHaveBeenCalledWith(42, "candidato forte em Go");
  });

  it("remove com confirmação", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const { user } = setup([dev()], { onRemove });

    await user.click(screen.getByRole("button", { name: /remover/i }));
    expect(onRemove).toHaveBeenCalledWith(42);
  });

  it("ignora remoção quando o usuário cancela o confirm", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const onRemove = vi.fn();
    const { user } = setup([dev()], { onRemove });

    await user.click(screen.getByRole("button", { name: /remover/i }));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
