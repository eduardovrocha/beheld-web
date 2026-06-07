/**
 * /accounts/:id/contact (app-shell v2) — smoke render of the compose
 * screen. Mocks contactsApi + positions + directory. Asserts the
 * focused layout (back-link, profile card, privacy callout), the
 * pinned vs open position field, the history threads and the 30-char
 * minimum gating the submit button.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContactTarget, ContactPreviousMessage } from "@/lib/contactsApi";
import type { Position } from "@/lib/companyDashboardApi";

import { AccountContact } from "./AccountContact";

const TARGET: ContactTarget["account"] = {
  id: 7, handle: "sofiaalv", bundle_slug: "sof", status: "verified",
  ecosystems: ["node", "rails", "react"], test_ratio: 73,
  last_bundle_at: "2026-05-01T00:00:00Z",
};

const PENDING_MSG: ContactPreviousMessage = {
  id: 1, job_title: "DevOps / Infra",
  body: "Olá sofiaalv, temos uma vaga que casa com seu perfil. Topa conversar?",
  reply_body: null, sent_at: "2026-05-20T12:00:00Z", responded_at: null, status: "pending",
};

const POSITIONS: Position[] = [
  {
    id: 31, title: "DevOps / Infra", description: null, location: {},
    technologies: [], sections: {}, status: "active", activated_at: null, expires_at: null,
    thresholds: [{ signal: "test_ratio", operator: "gte", value: { number: 20 } }],
    priorities: [{ signal: "test_ratio", ranking: 1, weight: 0.4 }],
    archived: false, archived_at: null, created_at: "2026-05-01T00:00:00Z",
  },
];

const loadContactTarget = vi.fn();
const sendContact = vi.fn();
const getPositionsMock = vi.fn();

vi.mock("@/lib/contactsApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/contactsApi")>();
  return {
    ...mod,
    loadContactTarget: (...a: unknown[]) => loadContactTarget(...a),
    sendContact: (...a: unknown[]) => sendContact(...a),
  };
});

vi.mock("@/lib/companyDashboardApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/companyDashboardApi")>();
  return { ...mod, getPositions: (...a: unknown[]) => getPositionsMock(...a) };
});

vi.mock("@/lib/directoryApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/directoryApi")>();
  return {
    ...mod,
    getDirectory: vi.fn().mockResolvedValue({
      ok: true, company: { id: 1, name: "nimbus tech" },
      available_ecosystems: [], filters: { ecosystems: [], test_ratio_min: "", test_ratio_max: "", status: "all" },
      results: [],
    }),
  };
});

function renderPage(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/accounts/7/contact${search}`]}>
      <Routes>
        <Route path="/accounts/:account_id/contact" element={<AccountContact />} />
        <Route path="/company/dashboard" element={<div data-testid="dash" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  loadContactTarget.mockResolvedValue({ ok: true, account: TARGET, previous_messages: [PENDING_MSG] });
  getPositionsMock.mockResolvedValue(POSITIONS);
});

describe("AccountContact (app-shell v2)", () => {
  it("renders the focused compose layout: back-link, profile card and callout", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".profile-card")).not.toBeNull());

    expect(container.querySelector(".back-link")).not.toBeNull();
    expect(container.querySelector(".profile-card__handle")?.textContent).toContain("@sofiaalv");
    expect(container.querySelector(".profile-card__meta")?.textContent).toContain("73%");
    expect(container.querySelectorAll(".profile-card__ecos span").length).toBe(3);
    // privacy callout with green check, role=status
    const callout = container.querySelector(".callout");
    expect(callout).not.toBeNull();
    expect(callout?.getAttribute("role")).toBe("status");
    // crumb has /contato
    expect(container.querySelector(".app__top .crumb")?.textContent).toContain("contato");
  });

  it("pins the position when a pending thread exists (state B)", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector(".pinned-pos")).not.toBeNull());

    expect(container.querySelector(".pinned-pos")?.textContent).toContain("DevOps / Infra");
    expect(container.querySelector(".pinned-pos .r")?.textContent).toContain("pinado");
    // history thread card with pending status
    expect(container.querySelectorAll(".thread").length).toBe(1);
    expect(container.querySelector(".thread__h .status .wait")).not.toBeNull();
    // hidden input carries the value
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"][name="job_title"]')?.value)
      .toBe("DevOps / Infra");
  });

  it("renders the open select on first message (state A) and gates submit on 30 chars", async () => {
    loadContactTarget.mockResolvedValue({ ok: true, account: TARGET, previous_messages: [] });
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector("select")).not.toBeNull());

    // no history section
    expect(container.querySelector(".thread")).toBeNull();

    const submit = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((b) => b.type === "submit")!;
    expect(submit.disabled).toBe(true);

    await user.selectOptions(container.querySelector("select")!, "DevOps / Infra");
    // criteria sanity-check hint appears (test ratio 73 ≥ 20)
    await waitFor(() => expect(container.querySelector(".crit-hint .ok")).not.toBeNull());

    const ta = container.querySelector<HTMLTextAreaElement>("textarea#msg")!;
    await user.type(ta, "curto");
    expect(submit.disabled).toBe(true);
    await user.type(ta, " — agora uma mensagem com mais de trinta caracteres.");
    await waitFor(() => expect(submit.disabled).toBe(false));
  });

  it("submits and redirects to the dashboard Mensagens tab", async () => {
    loadContactTarget.mockResolvedValue({ ok: true, account: TARGET, previous_messages: [] });
    sendContact.mockResolvedValue({ ok: true, message_id: 99 });
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector("select")).not.toBeNull());

    await user.selectOptions(container.querySelector("select")!, "DevOps / Infra");
    await user.type(
      container.querySelector<HTMLTextAreaElement>("textarea#msg")!,
      "Olá! Vi seu perfil e acho que temos uma vaga com a sua cara. Topa conversar?",
    );
    const submit = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((b) => b.type === "submit")!;
    await user.click(submit);

    await waitFor(() => expect(sendContact).toHaveBeenCalledWith("7", expect.objectContaining({
      job_title: "DevOps / Infra",
    })));
    await waitFor(() => expect(screen.getByTestId("dash")).toBeInTheDocument());
  });
});
