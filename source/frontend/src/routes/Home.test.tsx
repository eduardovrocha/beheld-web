/**
 * Home (landing v2) — smoke render of the full long-scroll page.
 *
 * Asserts the narrative skeleton is wired: nav anchors → section ids,
 * brand H1, the seven numbered sections, both install boxes, FAQ items
 * and the footer. MachineCounter's fetch is stubbed to fail, so the
 * counter row is absent (its behaviour is covered in its own test).
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Home } from "./Home";

class IONoop {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  // jsdom has no IntersectionObserver (useRevealMany needs one).
  vi.stubGlobal("IntersectionObserver", IONoop);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home (landing v2)", () => {
  it("renders the brand H1 and the long-scroll section anchors", () => {
    const { container } = render(<Home />);

    expect(container.querySelector(".hero__h")?.textContent).toBe(
      "Beheld by signal.Decided by you.",
    );

    // Every nav anchor has a matching section id.
    for (const id of ["top", "manifesto", "B3H31D", "sessoes", "verificacao"]) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("renders the seven numbered eyebrows in order", () => {
    const { container } = render(<Home />);
    const idxs = Array.from(container.querySelectorAll(".eyebrow .idx")).map(
      (el) => el.textContent,
    );
    expect(idxs).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
  });

  it("renders two install boxes (hero + CTA) and seven FAQ items", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll(".install").length).toBe(2);
    expect(container.querySelectorAll(".faq__item").length).toBe(7);
  });

  it("toggles the landing-v2-page html class on mount/unmount", () => {
    const { unmount } = render(<Home />);
    expect(document.documentElement.classList.contains("landing-v2-page")).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains("landing-v2-page")).toBe(false);
  });

  it("renders the footer brand + tagline", () => {
    const { container } = render(<Home />);
    expect(container.querySelector(".site-foot .fm--tag")?.textContent).toBe(
      "beheld.dev — Beheld by signal. Decided by you.",
    );
  });
});
