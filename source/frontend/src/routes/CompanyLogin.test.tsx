/**
 * /sessions/company/new (login empresa, app-shell v2) — smoke render.
 * Mocks companyApi (requestCompanyLink) + companyDashboardApi (session
 * pre-check). Asserta: pre-check sem flicker (redirect quando logado),
 * gating do submit, transição pro sent com o email EXATO digitado,
 * erro no campo para email não cadastrado (sem fingir envio), cooldown
 * do reenviar, linha suave após 3 reenvios e banner âmbar pro 429 sem
 * sair do sent.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyLogin, LOGIN_TUNING } from "./CompanyLogin";

const requestCompanyLink = vi.fn();
const getDashboard = vi.fn();

vi.mock("@/lib/companyApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/companyApi")>();
  return { ...mod, requestCompanyLink: (...a: unknown[]) => requestCompanyLink(...a) };
});

vi.mock("@/lib/companyDashboardApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/companyDashboardApi")>();
  return { ...mod, getDashboard: (...a: unknown[]) => getDashboard(...a) };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sessions/company/new"]}>
      <Routes>
        <Route path="/sessions/company/new" element={<CompanyLogin />} />
        <Route path="/company/dashboard" element={<div data-testid="dash" />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function submitValid(user: ReturnType<typeof userEvent.setup>, c: HTMLElement, typed = "HR@TuEmpresa.com") {
  await user.type(c.querySelector<HTMLInputElement>("#email")!, typed);
  await user.click(screen.getByRole("button", { name: /enviar link/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // default: sem sessão → form
  getDashboard.mockRejectedValue(new Error("401"));
  requestCompanyLink.mockResolvedValue({ ok: true, email: "hr@tuempresa.com" });
});

describe("CompanyLogin (login empresa, app-shell v2)", () => {
  it("redirects to the dashboard when a session cookie is active — form never renders", async () => {
    getDashboard.mockResolvedValue({});
    const { container } = renderPage();

    // nada renderizado durante o check (sem flicker)
    expect(container.querySelector(".login-card")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("dash")).toBeInTheDocument());
    expect(container.querySelector(".login-card")).toBeNull();
  });

  it("renders idle state: h1, trust strip, and a submit disabled until the email is valid", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".login-card")).not.toBeNull());

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Entrar como empresa");
    expect(container.querySelector(".login-trust")?.textContent).toContain("não pede senha");

    const btn = screen.getByRole("button", { name: /enviar link/i });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(requestCompanyLink).not.toHaveBeenCalled();

    await user.type(container.querySelector<HTMLInputElement>("#email")!, "hr@tuempresa.com");
    expect(btn).not.toBeDisabled();
  });

  it("submits lowercased but echoes the email exactly as typed in the sent state", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".login-card")).not.toBeNull());

    await submitValid(user, container, "HR@TuEmpresa.com");
    await waitFor(() => expect(requestCompanyLink).toHaveBeenCalledWith("hr@tuempresa.com"));

    const sent = container.querySelector(".login-sent")!;
    expect(sent.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Link enviado");
    // eco EXATO do que foi digitado — sem normalizar
    expect(sent.textContent).toContain("HR@TuEmpresa.com");
    // trust strip some no sent
    expect(container.querySelector(".login-trust")).toBeNull();
  });

  it("shows a field error for unregistered emails instead of faking the sent state", async () => {
    requestCompanyLink.mockResolvedValue({ ok: false, reason: "not_registered", status: 404 });
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".login-card")).not.toBeNull());

    await submitValid(user, container, "ghost@nowhere.dev");
    await waitFor(() =>
      expect(container.querySelector("#email-err")?.textContent).toBe(
        "Email não cadastrado. Confira o endereço ou crie sua conta.",
      ),
    );
    // Permanece no form (sem fingir envio) e o input fica marcado inválido.
    expect(container.querySelector(".login-sent")).toBeNull();
    expect(container.querySelector("#email")?.getAttribute("aria-invalid")).toBe("true");
  });

  it("resend enters the 60s cooldown with a visible countdown", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".login-card")).not.toBeNull());
    await submitValid(user, container);
    await waitFor(() => expect(container.querySelector(".login-sent")).not.toBeNull());

    await user.click(screen.getByRole("button", { name: /^reenviar$/i }));
    await waitFor(() => expect(requestCompanyLink).toHaveBeenCalledTimes(2));

    const cooled = screen.getByRole("button", { name: /reenviar em (60|59)s/i });
    expect(cooled).toBeDisabled();
  });

  it("appends the soft 'verifique o email' line after 3 resends", async () => {
    LOGIN_TUNING.resendCooldownS = 0; // sem cooldown — só o contador de reenvios
    try {
      const user = userEvent.setup();
      const { container } = renderPage();
      await waitFor(() => expect(container.querySelector(".login-card")).not.toBeNull());
      await submitValid(user, container);
      await waitFor(() => expect(container.querySelector(".login-sent")).not.toBeNull());

      for (let i = 1; i <= 3; i++) {
        await user.click(screen.getByRole("button", { name: /^reenviar$/i }));
        await waitFor(() => expect(requestCompanyLink).toHaveBeenCalledTimes(1 + i));
      }
      await waitFor(() =>
        expect(container.querySelector(".login-sent .soft")?.textContent)
          .toContain("verifique se digitou o email correto"));
      expect(container.querySelector('.login-sent .soft a[href="/empresa/cadastro"]')).not.toBeNull();
    } finally {
      LOGIN_TUNING.resendCooldownS = 60;
    }
  });

  it("429 shows the amber banner WITHOUT popping the user out of the sent state", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".login-card")).not.toBeNull());
    await submitValid(user, container);
    await waitFor(() => expect(container.querySelector(".login-sent")).not.toBeNull());

    requestCompanyLink.mockResolvedValue({ ok: false, reason: "unknown", status: 429 });
    await user.click(screen.getByRole("button", { name: /^reenviar$/i }));

    await waitFor(() => expect(container.querySelector('.login-alert[role="alert"]')?.textContent).toContain("Muitos pedidos"));
    expect(container.querySelector(".login-sent")).not.toBeNull();
  });
});
