import { describe, it, expect } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { MessagesList } from "./MessagesList";
import type { CompanyMessage } from "@/lib/companyDashboardApi";

// MessageCard usa useNavigate (card clicável → /accounts/:id/contact),
// então todo render precisa de um Router.
function render(ui: React.ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

const sample = (over: Partial<CompanyMessage> = {}): CompanyMessage => ({
  id:           1,
  account_id:   271,
  dev_handle:   "@alice",
  bundle_slug:  "abc123",
  job_title:    "Backend",
  body_excerpt: "Olá, tudo bem?",
  status:       "pending",
  sent_at:      "2026-05-20T12:00:00Z",
  responded_at: null,
  reply_body:   null,
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
    // Status agora é ícone — o rótulo vive em title/aria-label.
    expect(screen.getByLabelText(/aguardando resposta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/respondido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ignorado/i)).toBeInTheDocument();
  });

  it("não exibe link 'ver perfil' quando não há bundle_slug", () => {
    render(<MessagesList messages={[sample({ bundle_slug: null })]} />);
    expect(screen.queryByRole("link", { name: /ver perfil/i })).not.toBeInTheDocument();
  });

  it("exibe a resposta do dev quando há reply_body (F_REPLY)", () => {
    render(<MessagesList messages={[sample({
      status: "responded", dev_handle: "@alice",
      responded_at: "2026-05-21T10:00:00Z",
      reply_body: "Tenho interesse, podem mandar detalhes!",
    })]} />);
    expect(screen.getByText("Tenho interesse, podem mandar detalhes!")).toBeInTheDocument();
    expect(screen.getByText(/resposta de @alice/i)).toBeInTheDocument();
  });

  it("não renderiza bloco de resposta quando reply_body é nulo", () => {
    render(<MessagesList messages={[sample({ status: "responded", responded_at: "2026-05-21T10:00:00Z", reply_body: null })]} />);
    expect(screen.queryByText(/resposta de/i)).not.toBeInTheDocument();
  });
});
