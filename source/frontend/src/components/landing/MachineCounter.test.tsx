/**
 * MachineCounter — wired to GET /api/install/count. Renders nothing
 * until (and unless) the endpoint answers with a valid count; the
 * number then animates 0 → count and is formatted per locale.
 */
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MachineCounter } from "./MachineCounter";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(response) }),
  );
}

describe("MachineCounter", () => {
  it("renders the pluralised counter once the API answers", async () => {
    stubFetch({ count: 2417 });
    const { container } = render(<MachineCounter />);
    await waitFor(() => expect(container.querySelector(".hero__counter")).not.toBeNull());
    // The animated value lands on the target (pt-BR grouping: 2.417).
    await waitFor(
      () => expect(container.querySelector(".hero__counter b")?.textContent).toBe("2.417"),
      { timeout: 4000 },
    );
    expect(container.textContent).toContain("máquinas");
  });

  it("uses the singular form for count = 1", async () => {
    stubFetch({ count: 1 });
    const { container } = render(<MachineCounter />);
    await waitFor(() => expect(container.textContent).toContain("máquina"));
    await waitFor(() => expect(container.textContent).not.toContain("máquinas"));
  });

  it("renders nothing while the API hasn't answered or on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const { container } = render(<MachineCounter />);
    // Give the rejected promise a tick to settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector(".hero__counter")).toBeNull();
  });

  it("renders nothing on a malformed payload", async () => {
    stubFetch({ count: "lots" });
    const { container } = render(<MachineCounter />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector(".hero__counter")).toBeNull();
  });
});
