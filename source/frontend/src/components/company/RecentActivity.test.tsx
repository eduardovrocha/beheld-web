import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { RecentActivity } from "./RecentActivity";
import type { ActivityEvent } from "@/lib/companyDashboardApi";

function renderWithRouter(events: ActivityEvent[]) {
  return render(
    <MemoryRouter>
      <RecentActivity events={events} />
    </MemoryRouter>,
  );
}

describe("RecentActivity", () => {
  it("mostra o estado vazio com link para o diretório", () => {
    renderWithRouter([]);
    expect(screen.getByText(/Nenhuma atividade ainda/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /diretório/i });
    expect(link).toHaveAttribute("href", "/directory");
  });

  it("rotula uma verificação com ↗ e uma mensagem com ✉", () => {
    renderWithRouter([
      {
        type:        "verification",
        dev_handle:  "@alice",
        bundle_slug: "abc123",
        job_title:   null,
        at:          "2026-05-26T12:00:00Z",
      },
      {
        type:        "message",
        dev_handle:  "@bob",
        bundle_slug: "def456",
        job_title:   "Eng Sênior",
        status:      "pending",
        at:          "2026-05-26T11:00:00Z",
      },
    ]);

    expect(screen.getByText(/↗ verificação/)).toBeInTheDocument();
    expect(screen.getByText(/✉ mensagem/)).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("@bob")).toBeInTheDocument();
    expect(screen.getByText(/Eng Sênior/)).toBeInTheDocument();
    expect(screen.getByText(/aguardando/i)).toBeInTheDocument();
  });

  it("traduz cada status da mensagem", () => {
    renderWithRouter([
      { type: "message", dev_handle: "@a", bundle_slug: null, job_title: null, status: "responded", at: "2026-05-26T10:00:00Z" },
      { type: "message", dev_handle: "@b", bundle_slug: null, job_title: null, status: "ignored",   at: "2026-05-26T09:00:00Z" },
    ]);
    expect(screen.getByText(/respondido/i)).toBeInTheDocument();
    expect(screen.getByText(/ignorado/i)).toBeInTheDocument();
  });
});
