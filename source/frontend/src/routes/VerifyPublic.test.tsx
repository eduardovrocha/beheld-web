/**
 * /v/:id (perfil público, app-shell v2) — smoke render. Mocks lib/api +
 * lib/verify. Asserta o shell público (topbar + CTA, sem sidebar), o
 * hero (h1 + pills da gramática de sinal), o scores card (cores por
 * threshold + política do "—"), o perfil técnico (dl + vazios honestos)
 * e o rodapé de verificação por tier (unsigned ⚠ / rekor ✓).
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Bundle } from "@/lib/types";

import { VerifyPublic } from "./VerifyPublic";

function makeBundle(overrides: Partial<Bundle["payload"]> = {}, wrapper: Partial<Bundle> = {}): Bundle {
  return {
    version: "3",
    payload: {
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), // 2 dias atrás
      beheld_version: "0.9.0",
      previous_hash: null,
      scores: {
        date: "2026-06-03",
        prompt_quality: 48,
        test_maturity: 73,
        tech_breadth: 65,
        growth_rate: 34,
        overall: 62,
        sessions_analyzed: 112,
      },
      l1: {
        total_repos: 0,
        total_commits: 0,
        earliest_commit: null,
        latest_commit: null,
        ecosystems: {},
        platforms: {},
        avg_test_ratio: 0,
        root_commit_hashes: [],
      },
      l2: {
        platforms: { "claude-code": 90 },
        ecosystems: { react: 50, python: 30, node: 20 },
        workflow_distribution: { tdd: 0.4 },
        project_categories: {},
        workflow_metrics: {
          test_after_ratio: 0.1, test_first_ratio: 0.4,
          median_test_delay_min: 3, edit_to_test_lag_min: 4,
          bash_to_read_ratio: 1, prompt_avg_chars: 200, prompt_median_chars: 150,
          session_avg_duration_min: 40, tool_variety_avg: 4, ecosystem_concentration: 0.5,
        },
        sessions_analyzed: 112,
        period_days: 90,
      },
      ...overrides,
    },
    hash: "sha256:" + "a".repeat(64),
    signature: "ed25519:" + "b".repeat(128),
    public_key: "ed25519:KEY",
    attestation: null,
    ...wrapper,
  };
}

const fetchBundleWithAccount = vi.fn();
const verifyBundleMock = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/api")>();
  return { ...mod, fetchBundleWithAccount: (...a: unknown[]) => fetchBundleWithAccount(...a) };
});

vi.mock("@/lib/verify", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/verify")>();
  return { ...mod, verifyBundle: (...a: unknown[]) => verifyBundleMock(...a) };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/v/abc123"]}>
      <Routes>
        <Route path="/v/:id" element={<VerifyPublic />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchBundleWithAccount.mockResolvedValue({ bundle: makeBundle(), accountId: null, companyName: null });
  verifyBundleMock.mockResolvedValue({ ok: true, checks: {}, warnings: [] });
});

describe("VerifyPublic (perfil público, app-shell v2)", () => {
  it("renders the public shell: SiteNav CTA, no sidebar, hero h1 + signal pills", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".profile-hero")).not.toBeNull());

    expect(container.querySelector(".app--public")).not.toBeNull();
    expect(container.querySelector(".app__side")).toBeNull();
    expect(container.querySelector(".site-nav .public-cta")).not.toBeNull();

    // sem attestation → handle "dev"; bundle assinado → pill verde ✓ assinado
    const h1 = container.querySelector("h1.profile-hero__handle");
    expect(h1?.textContent).toContain("dev");
    expect(container.querySelector(".tagpill--ok")?.textContent).toContain("assinado");
  });

  it("colors the score bars by threshold and shows the overall /100", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll(".scorerow").length).toBe(4));

    expect(container.querySelector(".scores__big .v")?.textContent).toBe("62/100");
    const vals = Array.from(container.querySelectorAll(".scorerow .val")).map((el) => el.className);
    // 48 → neutro, 73 → ok, 65 → neutro, 34 → warn
    expect(vals[0]).toBe("val");
    expect(vals[1]).toContain("ok");
    expect(vals[2]).toBe("val");
    expect(vals[3]).toContain("warn");
  });

  it("renders the technical profile dl with honest '—' empties", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".attrs__b")).not.toBeNull());

    // linguagem dominante derivada do l2 (top 3)
    expect(screen.getByText("React · Python · Node.js")).toBeInTheDocument();
    // campos sem dado nunca somem — viram "—" com texto pra SR
    expect(container.querySelectorAll(".attrs__b dd.empty").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".visually-hidden").length).toBeGreaterThan(0);
    // sessões em destaque
    expect(container.querySelector(".attrs__b dd.big")?.textContent).toBe("112");
  });

  it("shows the /beheld import empty stack and the signature_only verification row", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".stack__empty")).not.toBeNull());

    expect(container.querySelector(".stack__empty code")?.textContent).toBe("/beheld import");

    // signature_only → linha ⚠ com upgrade path + captura ✓ sempre presente
    const cks = container.querySelectorAll(".verify-rows .ck");
    expect(cks[0].classList.contains("warn")).toBe(true);
    expect(cks[1].classList.contains("ok")).toBe(true);
    expect(screen.getByText("Assinatura local apenas")).toBeInTheDocument();
    expect(screen.getByText(/Não é auto-declarado/)).toBeInTheDocument();
  });

  it("treats an invalid signature as unsigned (state from the handoff reference)", async () => {
    verifyBundleMock.mockResolvedValue({ ok: false, checks: {}, warnings: [] });
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".profile-hero")).not.toBeNull());

    expect(container.querySelector(".tagpill--warn")?.textContent).toContain("não assinado");
    expect(screen.getByText("Não foi possível verificar")).toBeInTheDocument();
  });

  it("renders the expired state: banner + neutral pill + disabled copy", async () => {
    fetchBundleWithAccount.mockResolvedValue({
      bundle: makeBundle({ created_at: new Date(Date.now() - 45 * 86_400_000).toISOString() }),
      accountId: null, companyName: null,
    });
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".profile-banner")).not.toBeNull());

    expect(container.querySelector(".tagpill--neutral")?.textContent).toContain("expirado");
    expect(container.querySelector<HTMLButtonElement>(".verify-foot__bottom .copy")?.disabled).toBe(true);
  });

  it("renders state D (not found) with the brand nav", async () => {
    fetchBundleWithAccount.mockRejectedValue(new Error("Bundle não encontrado ou expirado."));
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByText("Esse perfil não existe no beheld")).toBeInTheDocument());
    expect(container.querySelector(".site-nav")).not.toBeNull();
  });
});
