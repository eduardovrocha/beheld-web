import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { MessagesList } from "./MessagesList";
import type { CompanyMessage } from "@/lib/companyDashboardApi";

const sample = (over: Partial<CompanyMessage> = {}): CompanyMessage => ({
  id:           1,
  dev_handle:   "@alice",
  bundle_slug:  "abc123",
  job_title:    "Backend",
  body_excerpt: "Olá, tudo bem?",
  status:       "pending",
  sent_at:      "2026-05-20T12:00:00Z",
  responded_at: null,
  ...over,
});

describe("MessagesList", () => {
  it("mostra estado vazio quando não há mensagens", () => {
    render(<MessagesList messages={[]} />);
    expect(screen.getByText(/Nenhuma mensagem enviada ainda/i)).toBeInTheDocument();
  });

  it("renderiza o trecho do corpo e o link 'ver perfil →'", () => {
    render(<MessagesList messages={[sample()]} />);
    expect(screen.getByText("Olá, tudo bem?")).toBeInTheDocument();
    expect(screen.getByText(/Backend/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /ver perfil/i });
    expect(link).toHaveAttribute("href", "/v/abc123");
  });

  it("traduz cada status para o rótulo correspondente", () => {
    render(<MessagesList messages={[
      sample({ id: 1, status: "pending" }),
      sample({ id: 2, status: "responded", dev_handle: "@bob",   responded_at: "2026-05-21T10:00:00Z" }),
      sample({ id: 3, status: "ignored",   dev_handle: "@carol" }),
    ]} />);
    expect(screen.getByText(/aguardando resposta/i)).toBeInTheDocument();
    expect(screen.getByText(/respondido/i)).toBeInTheDocument();
    expect(screen.getByText(/ignorado/i)).toBeInTheDocument();
  });

  it("não exibe link 'ver perfil' quando não há bundle_slug", () => {
    render(<MessagesList messages={[sample({ bundle_slug: null })]} />);
    expect(screen.queryByRole("link", { name: /ver perfil/i })).not.toBeInTheDocument();
  });
});
