import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatsGrid } from "./StatsGrid";
import type { DashboardStats } from "@/lib/companyDashboardApi";

const baseStats: DashboardStats = {
  verifications_total: 12,
  messages_total:      8,
  messages_responded:  5,
  response_rate:       63,
  saved_devs_total:    3,
};

describe("StatsGrid", () => {
  it("renderiza nada quando stats é null", () => {
    const { container } = render(<StatsGrid stats={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra os quatro cards com os totais e a taxa de resposta", () => {
    render(<StatsGrid stats={baseStats} />);
    expect(screen.getByText("verificações")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("mensagens enviadas")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("respondidas")).toBeInTheDocument();
    expect(screen.getByText("63%")).toBeInTheDocument();
    expect(screen.getByText("5 de 8")).toBeInTheDocument();
    expect(screen.getByText("devs salvos")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("mostra travessão quando response_rate é null", () => {
    render(<StatsGrid stats={{ ...baseStats, response_rate: null, messages_total: 0, messages_responded: 0 }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("0 de 0")).toBeInTheDocument();
  });
});
