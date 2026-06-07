/**
 * /directory (app-shell v2) — smoke render of the recruiter directory.
 * Mocks directoryApi. Asserts the two-pane layout (filters + results),
 * the ecosystem chips with active state, the dual-range inputs (a11y),
 * the result count and the dcard grid with mini-stats.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryPayload } from "@/lib/directoryApi";

import { Directory } from "./Directory";

const PAYLOAD: DirectoryPayload = {
  ok: true,
  company: { id: 1, name: "nimbus tech" },
  available_ecosystems: ["react", "node", "rails", "python"],
  filters: { ecosystems: ["react"], test_ratio_min: "0.25", test_ratio_max: "0.50", status: "all" },
  results: [
    { account_id: 1, handle: "sofiaalv", slug: "sof", ecosystems: ["react", "node"], platforms: ["github"],
      test_ratio: 0.42, last_bundle_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), status: "verified" },
    { account_id: 2, handle: "diegomar", slug: null, ecosystems: ["rails"], platforms: [],
      test_ratio: 0.12, last_bundle_at: null, status: "outdated" },
  ],
};

const getDirectory = vi.fn();

vi.mock("@/lib/directoryApi", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/directoryApi")>();
  return {
    ...mod,
    getDirectory: (...args: unknown[]) => getDirectory(...args),
  };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/directory"]}>
      <Directory />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getDirectory.mockResolvedValue(PAYLOAD);
});

describe("Directory (app-shell v2)", () => {
  it("renders the two-pane layout with filters and result count", async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector(".dir")).not.toBeNull());
    expect(container.querySelector(".filters")).not.toBeNull();
    expect(container.querySelector(".dir-res-h h3 b")?.textContent).toBe("2");
    // crumb carries the extra "directory" segment
    expect(container.querySelector(".app__top .crumb")?.textContent).toContain("directory");
  });

  it("renders ecosystem chips with the active state from the server filters", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll(".chip").length).toBe(4));

    const on = Array.from(container.querySelectorAll(".chip.on")).map((c) => c.textContent ?? "");
    expect(on.length).toBe(1);
    expect(on[0]).toContain("react");
  });

  it("renders accessible dual-range inputs for test ratio", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/mínimo/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/máximo/i)).toBeInTheDocument();
  });

  it("renders dcards with mini-stats and tier coloring by status", async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll(".dcard").length).toBe(2));

    const first = container.querySelectorAll(".dcard")[0];
    expect(first.querySelector(".dcard__h")?.textContent).toBe("@sofiaalv");
    expect(first.querySelector(".dcard__tier")?.classList.contains("tier--2")).toBe(true);
    // test ratio ≥ 30% → green
    expect(first.querySelector(".dcard__mini .v.ok")).not.toBeNull();
    expect(first.querySelectorAll(".dcard__eco span").length).toBe(2);
  });

  it("applies filters via the explicit button", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll(".chip").length).toBe(4));
    getDirectory.mockClear();

    const apply = Array.from(container.querySelectorAll<HTMLButtonElement>(".filters__foot button"))
      .find((b) => b.type === "submit");
    await user.click(apply!);

    await waitFor(() => expect(getDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ ecosystems: ["react"], test_ratio_min: "0.25", test_ratio_max: "0.50" }),
    ));
  });
});
