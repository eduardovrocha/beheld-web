/**
 * /companies/new (cadastro de empresa, app-shell v2) — smoke render.
 * Mocks lib/companyApi. Asserta o shell público + stepper (aria-current
 * no passo 01), as validações do handoff (domínio hostname, email no
 * mesmo domínio, termos obrigatórios), o placeholder dinâmico do email
 * e o fluxo de sucesso (stepper avança pro passo 02).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompaniesNew } from "./CompaniesNew";

const signupCompany = vi.fn();

vi.mock("@/lib/companyApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/companyApi")>();
  return { ...mod, signupCompany: (...a: unknown[]) => signupCompany(...a) };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/companies/new"]}>
      <CompaniesNew />
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>, c: HTMLElement) {
  await user.type(c.querySelector<HTMLInputElement>("#company")!, "Nimbus Tech");
  await user.type(c.querySelector<HTMLInputElement>("#domain")!, "nimbustech.com");
  await user.type(c.querySelector<HTMLInputElement>("#admin-name")!, "Maria Souza");
  await user.type(c.querySelector<HTMLInputElement>("#email")!, "maria@nimbustech.com");
  await user.click(c.querySelector<HTMLInputElement>('.terms input[type="checkbox"]')!);
}

beforeEach(() => {
  vi.clearAllMocks();
  signupCompany.mockResolvedValue({ ok: true, email: "maria@nimbustech.com", name: "Nimbus Tech" });
});

describe("CompaniesNew (cadastro de empresa, app-shell v2)", () => {
  it("renders the public shell with the 3-step verification stepper", () => {
    const { container } = renderPage();

    expect(container.querySelector(".app--public")).not.toBeNull();
    expect(container.querySelector(".app__top .topnav")).not.toBeNull();

    const steps = container.querySelectorAll(".stepper .step");
    expect(steps.length).toBe(3);
    expect(steps[0].classList.contains("is-now")).toBe(true);
    expect(steps[0].getAttribute("aria-current")).toBe("step");
    expect(steps[0].textContent).toContain("você está aqui");
    expect(steps[2].textContent).toContain("DNS TXT");
  });

  it("updates the email placeholder live from the domain field", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const email = container.querySelector<HTMLInputElement>("#email")!;

    expect(email.placeholder).toBe("voce@nimbustech.com");
    await user.type(container.querySelector<HTMLInputElement>("#domain")!, "acme.dev");
    expect(email.placeholder).toBe("voce@acme.dev");
  });

  it("blocks submit with inline errors: bad domain, mismatched email, unchecked terms", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await user.type(container.querySelector<HTMLInputElement>("#company")!, "Nimbus Tech");
    await user.type(container.querySelector<HTMLInputElement>("#domain")!, "https://nimbustech.com/x");
    await user.type(container.querySelector<HTMLInputElement>("#admin-name")!, "Maria Souza");
    await user.type(container.querySelector<HTMLInputElement>("#email")!, "maria@gmail.com");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(signupCompany).not.toHaveBeenCalled();
    expect(container.querySelector("#domain")?.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Aceita os termos pra continuar.")).toBeInTheDocument();

    // corrige o domínio → o erro de email vira "precisa ser @<domínio>"
    const domain = container.querySelector<HTMLInputElement>("#domain")!;
    await user.clear(domain);
    await user.type(domain, "nimbustech.com");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));
    expect(screen.getByText("O email precisa ser @nimbustech.com.")).toBeInTheDocument();
    expect(signupCompany).not.toHaveBeenCalled();
  });

  it("submits a valid form and advances the stepper to step 02", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await fillValidForm(user, container);
    expect(container.querySelector(".terms")?.classList.contains("is-checked")).toBe(true);

    await user.click(screen.getByRole("button", { name: /criar conta/i }));
    await waitFor(() => expect(signupCompany).toHaveBeenCalledWith({
      name: "Nimbus Tech", email: "maria@nimbustech.com",
    }));

    // estado "enviado": stepper avança (passo 01 ✓, passo 02 atual)
    await waitFor(() => {
      const steps = container.querySelectorAll(".stepper .step");
      expect(steps[0].classList.contains("is-done")).toBe(true);
      expect(steps[1].classList.contains("is-now")).toBe(true);
    });
    expect(screen.getByText("maria@nimbustech.com")).toBeInTheDocument();
  });

  it("maps a 422 from the server to inline field errors", async () => {
    signupCompany.mockResolvedValue({ ok: false, status: 422, errors: { email: ["já está em uso"] } });
    const user = userEvent.setup();
    const { container } = renderPage();

    await fillValidForm(user, container);
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() => expect(screen.getByText("já está em uso")).toBeInTheDocument());
    expect(container.querySelector("#email")?.getAttribute("aria-invalid")).toBe("true");
  });

  it("shows the amber banner with role=alert for generic server errors", async () => {
    signupCompany.mockResolvedValue({ ok: false, status: 429, message: "rate limited" });
    const user = userEvent.setup();
    const { container } = renderPage();

    await fillValidForm(user, container);
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() => expect(container.querySelector('.signup-alert[role="alert"]')?.textContent).toBe("rate limited"));
  });
});
