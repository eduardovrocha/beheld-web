import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { PositionsList } from "./PositionsList";
import type { Position } from "@/lib/companyDashboardApi";

function makePosition(over: Partial<Position> = {}): Position {
  return {
    id: 1, title: "Backend", description: null, location: {},
    technologies: [], sections: {}, status: "active",
    activated_at: null, expires_at: null, thresholds: [], priorities: [],
    archived: false, archived_at: null, created_at: "2026-05-28T10:00:00Z",
    ...over,
  };
}

// Render the list empty, then open the "nova posição" form. No position is
// selected, so the matches panel (which calls the API) never mounts.
function setup() {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <PositionsList
        positions={[]}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onArchive={vi.fn()}
        onReactivate={vi.fn()}
        onPurge={vi.fn()} />
    </MemoryRouter>,
  );
  return { onCreate, user: userEvent.setup() };
}

async function openNewForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /nova posição/i }));
}

describe("PositionsList — new form tabs (PF.2)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("troca de aba preserva os dados digitados", async () => {
    const { user } = setup();
    await openNewForm(user);

    const title = screen.getByPlaceholderText(/Engenheiro Backend/i);
    await user.type(title, "Backend Sênior");

    await user.click(screen.getByRole("tab", { name: /critérios de match/i }));
    expect(screen.queryByPlaceholderText(/Engenheiro Backend/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /descrição/i }));
    expect(screen.getByPlaceholderText(/Engenheiro Backend/i)).toHaveValue("Backend Sênior");
  });

  it("o botão Salvar está presente em ambas as abas", async () => {
    const { user } = setup();
    await openNewForm(user);
    expect(screen.getByRole("button", { name: /cadastrar posição/i })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /critérios de match/i }));
    expect(screen.getByRole("button", { name: /cadastrar posição/i })).toBeInTheDocument();
  });

  it("submit sem título não chama onCreate e mostra erro", async () => {
    const { onCreate, user } = setup();
    await openNewForm(user);
    // Espaços passam pela validação nativa de `required` mas falham no nosso
    // guard (title.trim() vazio) — exercita a checagem JS e o banner de erro.
    await user.type(screen.getByPlaceholderText(/Engenheiro Backend/i), "   ");
    await user.click(screen.getByRole("button", { name: /cadastrar posição/i }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByText(/título é obrigatório/i)).toBeInTheDocument();
  });
});

describe("item-list sections (Requirements / Qualifications / Nice to Have)", () => {
  beforeEach(() => vi.restoreAllMocks());

  // The "+ item" button for the Requirements section is the first of three.
  async function openAndFindRequirements(user: ReturnType<typeof userEvent.setup>) {
    await openNewForm(user);
    const addButtons = screen.getAllByRole("button", { name: /\+ item/i });
    expect(addButtons).toHaveLength(3); // requirements, qualifications, nice_to_have
    return addButtons[0];
  }

  it("começa com um único input por seção de lista", async () => {
    const { user } = setup();
    await openNewForm(user);
    // 3 botões "+ item" — uma por seção de lista
    expect(screen.getAllByRole("button", { name: /\+ item/i })).toHaveLength(3);
  });

  it("'+ item' adiciona um novo input na seção", async () => {
    const { user } = setup();
    const addReq = await openAndFindRequirements(user);
    const before = screen.getAllByRole("textbox").length;
    await user.click(addReq);
    expect(screen.getAllByRole("textbox").length).toBe(before + 1);
  });

  it("salva cada item como uma linha e descarta itens vazios", async () => {
    const { onCreate, user } = setup();
    await user.click(screen.getByRole("button", { name: /nova posição/i }));
    await user.type(screen.getByPlaceholderText(/Engenheiro Backend/i), "Backend");

    const addReq = screen.getAllByRole("button", { name: /\+ item/i })[0];
    // primeiro input de requirements: placeholder "3+ anos com…"
    const firstReq = screen.getByPlaceholderText(/3\+ anos com/i);
    await user.type(firstReq, "3+ anos de Rails");
    await user.click(addReq); // adiciona um segundo input (fica vazio)

    // O form atual exige ao menos um critério de match para salvar — habilita
    // test ratio para o submit completar.
    await user.click(screen.getByRole("tab", { name: /critérios de match/i }));
    await user.click(screen.getAllByRole("checkbox")[1]);
    await user.click(screen.getByRole("tab", { name: /descrição/i }));

    await user.click(screen.getByRole("button", { name: /cadastrar posição/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    const payload = onCreate.mock.calls[0][0];
    expect(payload.sections.requirements).toBe("3+ anos de Rails"); // sem linha vazia
  });
});

describe("abas Ativa | Arquivada + exclusão", () => {
  beforeEach(() => vi.restoreAllMocks());

  function renderList(positions: Position[], onPurge = vi.fn()) {
    render(
      <MemoryRouter>
        <PositionsList positions={positions} onCreate={vi.fn()}
          onUpdate={vi.fn()} onArchive={vi.fn()} onReactivate={vi.fn()} onPurge={onPurge} />
      </MemoryRouter>,
    );
    return { onPurge, user: userEvent.setup() };
  }

  it("aba Ativa lista só não-arquivadas; Arquivada só as arquivadas", async () => {
    const { user } = renderList([
      makePosition({ id: 1, title: "Vaga Ativa" }),
      makePosition({ id: 2, title: "Vaga Velha", archived: true, archived_at: "2026-05-01T00:00:00Z", status: "closed" }),
    ]);
    // Ativa por padrão
    expect(screen.getByRole("button", { name: /Vaga Ativa/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Vaga Velha/ })).not.toBeInTheDocument();
    // troca pra Arquivada
    await user.click(screen.getByRole("tab", { name: /arquivada/i }));
    expect(screen.getByRole("button", { name: /Vaga Velha/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Vaga Ativa/ })).not.toBeInTheDocument();
  });

  it("vaga arquivada mostra 'Excluir permanentemente' e chama onPurge", async () => {
    const onPurge = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user } = renderList([
      makePosition({ id: 7, title: "Arquivada", archived: true, archived_at: "2026-05-01T00:00:00Z", status: "closed" }),
    ], onPurge);

    await user.click(screen.getByRole("tab", { name: /arquivada/i }));
    await user.click(screen.getByRole("button", { name: /excluir permanentemente/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onPurge).toHaveBeenCalledWith(7);
  });

  it("vaga ativa não oferece exclusão permanente (só Arquivar)", () => {
    renderList([makePosition({ id: 1, title: "Ativa" })]);
    expect(screen.queryByRole("button", { name: /excluir permanentemente/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /arquivar/i })).toBeInTheDocument();
  });
});

describe("fusão Technical Stack → Tecnologias", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("não renderiza mais o campo Technical Stack no form", async () => {
    const onCreate = vi.fn();
    render(
      <MemoryRouter>
        <PositionsList positions={[]} onCreate={onCreate}
          onUpdate={vi.fn()} onArchive={vi.fn()} onReactivate={vi.fn()} onPurge={vi.fn()} />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /nova posição/i }));
    expect(screen.queryByText(/technical stack/i)).not.toBeInTheDocument();
    // mas o campo Tecnologias continua presente
    expect(screen.getByText(/^Tecnologias$/i)).toBeInTheDocument();
  });

  it("editar position com technical_stack legado popula as tags de Tecnologias", async () => {
    const pos = makePosition({
      technologies: ["Rails"],
      sections: { technical_stack: "Trabalhamos com PostgreSQL, Docker e React" },
    });
    render(
      <MemoryRouter>
        <PositionsList positions={[pos]} onCreate={vi.fn()}
          onUpdate={vi.fn()} onArchive={vi.fn()} onReactivate={vi.fn()} onPurge={vi.fn()} />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^editar$/i }));

    // a tag original + os techs extraídos do technical_stack aparecem juntos
    for (const tech of ["Rails", "PostgreSQL", "Docker", "React"]) {
      expect(screen.getByText(tech)).toBeInTheDocument();
    }
  });
});

describe("MatchCriteriaEditor — slider + priorities (PF.8/PF.9)", () => {
  beforeEach(() => vi.restoreAllMocks());

  async function openCriteria(user: ReturnType<typeof userEvent.setup>) {
    await openNewForm(user);
    await user.click(screen.getByRole("tab", { name: /critérios de match/i }));
  }

  // Checkboxes na ordem: [0] ecosystems, [1] test_ratio, [2] recency.
  it("test ratio: slider e input numérico ficam sincronizados", async () => {
    const { user } = setup();
    await openCriteria(user);
    await user.click(screen.getAllByRole("checkbox")[1]);

    const slider = screen.getByRole("slider");
    const number = screen.getAllByRole("spinbutton")[0]; // [0] test_ratio, [1] recency
    expect(slider).toHaveValue("30"); // default

    fireEvent.change(number, { target: { value: "55" } });
    expect(slider).toHaveValue("55");

    fireEvent.change(slider, { target: { value: "70" } });
    expect(number).toHaveValue(70);
  });

  it("drag-to-rank mostra apenas critérios habilitados, com pesos 40/30", async () => {
    const { user } = setup();
    await openCriteria(user);
    await user.click(screen.getAllByRole("checkbox")[1]); // test_ratio
    await user.click(screen.getAllByRole("checkbox")[2]); // recency

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/test ratio/i);
    expect(items[0]).toHaveTextContent(/40%/);
    expect(items[1]).toHaveTextContent(/recência/i);
    expect(items[1]).toHaveTextContent(/30%/);
  });

  it("desabilitar um critério o remove da lista de prioridade", async () => {
    const { user } = setup();
    await openCriteria(user);
    const testRatio = screen.getAllByRole("checkbox")[1];
    await user.click(testRatio);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await user.click(testRatio);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
