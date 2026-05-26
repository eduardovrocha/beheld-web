import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SaveDevButton } from "./SaveDevButton";

vi.mock("@/lib/companyDashboardApi", async () => {
  class CompanyAuthError extends Error {}
  return {
    CompanyAuthError,
    saveDev: vi.fn(),
  };
});

import { saveDev, CompanyAuthError } from "@/lib/companyDashboardApi";

const mockedSaveDev = saveDev as unknown as ReturnType<typeof vi.fn>;

describe("SaveDevButton", () => {
  beforeEach(() => {
    mockedSaveDev.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("não renderiza nada quando hidden=true", () => {
    const { container } = render(<SaveDevButton accountId={1} hidden />);
    expect(container).toBeEmptyDOMElement();
  });

  it("começa em '+ salvar' e passa para 'salvo ✓' após POST com sucesso", async () => {
    mockedSaveDev.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<SaveDevButton accountId={42} />);

    expect(screen.getByRole("button", { name: /\+ salvar/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /\+ salvar/i }));

    expect(mockedSaveDev).toHaveBeenCalledWith(42, null);
    await waitFor(() => expect(screen.getByText(/salvo ✓/i)).toBeInTheDocument());
  });

  it("começa em 'salvo ✓' quando alreadySaved=true", () => {
    render(<SaveDevButton accountId={1} alreadySaved />);
    expect(screen.getByText(/salvo ✓/i)).toBeInTheDocument();
  });

  it("mostra 'login necessário' em CompanyAuthError", async () => {
    mockedSaveDev.mockRejectedValue(new CompanyAuthError());
    const user = userEvent.setup();
    render(<SaveDevButton accountId={1} />);

    await user.click(screen.getByRole("button", { name: /\+ salvar/i }));
    await waitFor(() => expect(screen.getByText(/login necessário/i)).toBeInTheDocument());
  });

  it("mostra 'falha ao salvar' em erro genérico", async () => {
    mockedSaveDev.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<SaveDevButton accountId={1} />);

    await user.click(screen.getByRole("button", { name: /\+ salvar/i }));
    await waitFor(() => expect(screen.getByText(/falha ao salvar/i)).toBeInTheDocument());
  });
});
