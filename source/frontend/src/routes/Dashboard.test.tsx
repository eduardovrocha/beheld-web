/**
 * Dashboard (app-shell v2) — smoke render of the dev dashboard.
 *
 * Mocks lib/dashboardApi: `getDashboard` resolves the handoff's
 * empty / first-run payload (0 bundles, contact configured, tier
 * signature_only). Asserts the shell skeleton (topbar, sidebar, page
 * header), the gramática de sinal in the stat cards, the 48-bar empty
 * evolution chart, the 5-tier ladder and the 5-layer chain.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardPayload } from "@/lib/dashboardApi";

import { Dashboard } from "./Dashboard";

const EMPTY_PAYLOAD: DashboardPayload = {
  account: {
    id: "acc_1",
    fingerprint: "511ac8dafb25cc52ee9a2d0f7891b3a6c4f2d8e1",
    handle: "dev-511ac8da",
    email_recovery: null,
    email_contact: "dev@example.com",
    phone_contact: null,
    directory: false,
    watch: false,
    notification_email: null,
    notification_webhook: null,
    contact_configured: true,
  },
  bundles: [],
  notifications: [],
  messages: [],
  interest: { companies: 0 },
  evolution: { points: 0, last_bundle_at: null, days_since_last: null, stale_for_curve: false },
};

const getDashboard = vi.fn();

vi.mock("@/lib/dashboardApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/dashboardApi")>();
  return {
    ...mod,
    getSessionToken: () => "tok",
    getDashboard: (...args: unknown[]) => getDashboard(...args),
  };
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getDashboard.mockResolvedValue(EMPTY_PAYLOAD);
});

afterEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
});

describe("Dashboard (app-shell v2)", () => {
  it("renders the shell: topbar crumb, sidebar nav and page header", async () => {
    const { container } = renderDashboard();
    await waitFor(() => expect(getDashboard).toHaveBeenCalled());

    // topbar — wordmark + handle on the account-menu trigger (right cluster)
    expect(container.querySelector(".app__top .lk-word")?.textContent).toBe("beheld");
    expect(container.querySelector(".app__actions .dd__t--user .you")?.textContent).toBe("@dev-511ac8da");

    // sidebar — foot
    expect(container.querySelector(".app__side .foot")).not.toBeNull();

    // page header — h1 + full fingerprint + copy button
    expect(container.querySelector(".page-h h1")?.textContent).toBe("Dashboard");
    expect(container.querySelector(".page-h__fp code")?.textContent).toBe(
      "511ac8dafb25cc52ee9a2d0f7891b3a6c4f2d8e1",
    );
    expect(container.querySelector(".page-h__fp .copy")).not.toBeNull();
  });

  it("renders the empty-state stat cards with the signal grammar", async () => {
    const { container } = renderDashboard();
    await waitFor(() => expect(container.querySelectorAll(".stat").length).toBe(3));

    // bundles: 0 dim + empty pill; contato: ok; tier: warn
    expect(container.querySelector(".stat__v.dim")?.textContent).toBe("0");
    expect(container.querySelector(".pill--ok")).not.toBeNull();
    expect(container.querySelector(".pill--warn")).not.toBeNull();
    expect(screen.getByText("signature_only", { selector: ".stat__v" })).toBeInTheDocument();
  });

  it("renders the empty evolution chart (48 bars + overlay) and the 5-tier ladder", async () => {
    const { container } = renderDashboard();
    await waitFor(() => expect(container.querySelector(".evo")).not.toBeNull());

    expect(container.querySelectorAll(".evo .b").length).toBe(48);
    expect(container.querySelector(".empty-overlay")).not.toBeNull();

    const rows = container.querySelectorAll(".ladder__r");
    expect(rows.length).toBe(5);
    expect(rows[0].classList.contains("is-current")).toBe(true);
    expect(rows[0].textContent).toContain("signature_only");
  });

  it("toggles the app-v2-page html class on mount/unmount", async () => {
    const { unmount } = renderDashboard();
    expect(document.documentElement.classList.contains("app-v2-page")).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains("app-v2-page")).toBe(false);
  });

  it("shows the 5-layer verification chain on the Verificações sub-tab", async () => {
    const { container } = renderDashboard();
    await waitFor(() => expect(container.querySelectorAll(".tabs button").length).toBe(3));

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>(".tabs button"));
    tabs[2].click();
    await waitFor(() => expect(container.querySelectorAll(".vrow").length).toBe(5));

    // layer 1 verified, layer 2 pending (no bundles yet), 3–5 off
    const states = Array.from(container.querySelectorAll(".vrow .st")).map((el) => el.textContent);
    expect(states).toEqual(["verified", "pending", "off", "off", "off"]);
  });

  it("renders the shell with an error panel when the session is invalid", async () => {
    getDashboard.mockRejectedValue(new Error("API 500: boom"));
    const { container } = renderDashboard();

    await waitFor(() => expect(screen.getByText(/API 500: boom/)).toBeInTheDocument());
    // shell stays mounted even on error
    expect(container.querySelector(".app__top")).not.toBeNull();
    expect(container.querySelector(".app__side")).not.toBeNull();
  });
});
