/**
 * /company/dashboard (app-shell v2) — smoke render of the recruiter
 * dashboard. Mocks useCompanyDashboard (data) + directoryApi (company
 * name / dev count) + position matches. Asserts the shell skeleton,
 * the três sub-tabs with count chips, the Mensagens rows (gramática de
 * sinal ✓/✕/◷), Devs salvos rows and the Posições list + detail.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CompanyMessage, Position, SavedDev } from "@/lib/companyDashboardApi";

import { CompanyDashboardPage } from "./Dashboard";

const MESSAGES: CompanyMessage[] = [
  { id: 1, account_id: 11, dev_handle: "showcasestack", bundle_slug: "abc", job_title: "Engenheiro Backend Sênior (Rails)",
    body_excerpt: "Oi! Vi seu perfil…", status: "responded", sent_at: "2026-05-28T12:00:00Z", responded_at: "2026-05-28T15:00:00Z", reply_body: "opa" },
  { id: 2, account_id: 12, dev_handle: "sofiaper", bundle_slug: null, job_title: "Fullstack React + Node",
    body_excerpt: "Olá, tudo bem?", status: "ignored", sent_at: "2026-05-21T12:00:00Z", responded_at: null, reply_body: null },
  { id: 3, account_id: 13, dev_handle: "sofiaalv", bundle_slug: null, job_title: "DevOps / Infra",
    body_excerpt: "Temos uma vaga…", status: "pending", sent_at: "2026-05-20T12:00:00Z", responded_at: null, reply_body: null },
];

const SAVED: SavedDev[] = [
  { account_id: 21, dev_handle: "beafre3", bundle_slug: "bea", bundle_status: "verified",
    note: "Forte em rails · revisitar no Q3", saved_at: "2026-05-24T10:00:00Z" },
  { account_id: 22, dev_handle: "sofiapin", bundle_slug: null, bundle_status: null,
    note: null, saved_at: "2026-05-28T10:00:00Z" },
];

const POSITIONS: Position[] = [
  {
    id: 31, title: "Fullstack React + Node", description: null,
    location: { city: "São Paulo", raw: "São Paulo · híbrido" },
    technologies: ["React", "Node", "TypeScript"],
    sections: { responsibilities: "Features de ponta a ponta.", requirements: "3+ anos." },
    status: "active", activated_at: "2026-05-28T00:00:00Z", expires_at: "2026-06-27T00:00:00Z",
    thresholds: [
      { signal: "ecosystems", operator: "includes", value: { items: ["react", "node"] } },
      { signal: "test_ratio", operator: "gte", value: { number: 20 } },
    ],
    priorities: [
      { signal: "ecosystems", ranking: 1, weight: 0.4 },
      { signal: "test_ratio", ranking: 2, weight: 0.3 },
    ],
    archived: false, archived_at: null, created_at: "2026-05-28T00:00:00Z",
  },
];

const hookState = {
  stats: null, recentActivity: [], messages: MESSAGES, savedDevs: SAVED, positions: POSITIONS,
  loading: false, error: null, authRequired: false,
  saveDev: vi.fn(), updateNote: vi.fn(), removeSavedDev: vi.fn(),
  createPosition: vi.fn(), updatePosition: vi.fn(), archivePosition: vi.fn(),
  reactivatePosition: vi.fn(), purgePosition: vi.fn(),
  reloadMessages: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/hooks/useCompanyDashboard", () => ({
  useCompanyDashboard: () => hookState,
}));

vi.mock("@/lib/directoryApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/directoryApi")>();
  return {
    ...mod,
    getDirectory: vi.fn().mockResolvedValue({
      ok: true, company: { id: 1, name: "nimbus tech" },
      available_ecosystems: [], filters: { ecosystems: [], test_ratio_min: "", test_ratio_max: "", status: "all" },
      results: new Array(39).fill(null).map((_, i) => ({
        account_id: i, handle: `dev${i}`, slug: null, ecosystems: [], platforms: [],
        test_ratio: null, last_bundle_at: null, status: null,
      })),
    }),
  };
});

const logoutCompany = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/companyApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/companyApi")>();
  return { ...mod, logoutCompany: (...a: unknown[]) => logoutCompany(...a) };
});

vi.mock("@/lib/companyDashboardApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/companyDashboardApi")>();
  return {
    ...mod,
    getPositionMatches: vi.fn().mockResolvedValue({
      calculated_at: "2026-05-28T17:17:00Z",
      matches: [{
        account_id: 41, dev_handle: "sofiaalv", bundle_slug: "sof", score: 90, score_decimal: 90.2,
        match_type: "match", failed_signal: null,
        curve: { status: "available", current: 72.8, delta: -2.1, trend: "down", points: 2, period_days: 22 },
        calculated_at: "2026-05-28T17:17:00Z",
      }],
      near_miss: [],
    }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/company/dashboard"]}>
      <Routes>
        <Route path="/company/dashboard" element={<CompanyDashboardPage />} />
        <Route path="/empresa/entrar" element={<div data-testid="login" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
});

afterEach(() => {
  window.location.hash = "";
});

describe("CompanyDashboardPage (app-shell v2)", () => {
  it("renders the shell with company crumb and the three big sub-tabs", async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(container.querySelector(".app__top .crumb")?.textContent).toContain("nimbus tech"));

    const tabs = container.querySelectorAll(".tabs--big button");
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toContain("3");  // mensagens
    expect(tabs[1].textContent).toContain("2");  // devs salvos
    expect(tabs[2].textContent).toContain("1");  // posições
  });

  it("renders message rows with the signal grammar (✓ / ✕ / ◷)", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll(".row").length).toBe(3));

    expect(container.querySelectorAll(".row .st.ok").length).toBe(1);
    expect(container.querySelectorAll(".row .st.no").length).toBe(1);
    expect(container.querySelectorAll(".row .st.wait").length).toBe(1);
    expect(screen.getByText("@showcasestack")).toBeInTheDocument();
  });

  it("switches to Devs salvos via the sidebar quick-jump and shows notes", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll(".row").length).toBe(3));

    const sidebarButtons = Array.from(container.querySelectorAll<HTMLButtonElement>(".app__side button.item"));
    const devsBtn = sidebarButtons.find((b) => b.textContent?.includes("Devs"));
    expect(devsBtn).toBeDefined();
    await user.click(devsBtn!);

    await waitFor(() => expect(container.querySelectorAll(".row--saved").length).toBe(2));
    expect(screen.getByText("Forte em rails · revisitar no Q3")).toBeInTheDocument();
    expect(container.querySelector(".note .placeholder")).not.toBeNull();
    expect(window.location.hash).toBe("#devs");
  });

  it("logs out from the sidebar foot: destroys the session and lands on the login", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".app__side .foot .signout")).not.toBeNull());

    await user.click(container.querySelector<HTMLButtonElement>(".app__side .foot .signout")!);
    await waitFor(() => expect(logoutCompany).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("login")).toBeInTheDocument());
  });

  it("shows the positions list with detail panel, criteria and matches", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll(".row").length).toBe(3));

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>(".tabs--big button"));
    await user.click(tabs[2]);

    // first position auto-opens with the description tab
    await waitFor(() => expect(container.querySelector(".pos-card.is-open")).not.toBeNull());
    expect(container.querySelector(".pos-detail h2")?.textContent).toBe("Fullstack React + Node");
    expect(container.querySelectorAll(".tech-row .tech").length).toBe(3);
    expect(container.querySelectorAll(".criteria__r").length).toBe(2);
    expect(container.querySelector(".criteria__r .w")?.textContent).toBe("40%");

    // matches sub-tab (prefetched — count chip shows 1)
    const matchTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".pos-detail__tabs button"))[1];
    await waitFor(() => expect(matchTab.textContent).toContain("1"));
    await user.click(matchTab);

    await waitFor(() => expect(container.querySelectorAll(".mrow").length).toBe(1));
    expect(container.querySelector(".mrow .pct")?.textContent).toBe("90%");
    expect(container.querySelector(".mrow .why .down")).not.toBeNull(); // curva ↓ em amber
  });
});
