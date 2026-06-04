/**
 * ObservedTerminal — under prefers-reduced-motion, must render the
 * final state immediately (no typing/spinners/count-ups).
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ObservedTerminal } from "./ObservedTerminal";

function matchMediaMock(matches: boolean) {
  return (query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

describe("ObservedTerminal", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(matchMediaMock(true)),
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reaches the final snapshot state immediately under reduced motion", () => {
    const { container } = render(<ObservedTerminal />);

    // Command is fully typed.
    const line = container.querySelector(".tline")?.textContent ?? "";
    expect(line).toContain("$ beheld view --snapshot");

    // All three process steps marked ✓.
    const checks = container.querySelectorAll(".proclog .ok");
    expect(checks.length).toBe(3);

    // Snapshot is visible.
    expect(container.querySelector(".snap.in")).not.toBe(null);

    // Three signals visible with final percentage values.
    const sigs = container.querySelectorAll(".sig.in");
    expect(sigs.length).toBe(3);
    const values = Array.from(container.querySelectorAll(".sig .v")).map(
      (n) => n.textContent,
    );
    expect(values).toEqual(["87%", "38%", "2%"]);

    // Stats shown with final values.
    const stats = Array.from(container.querySelectorAll(".snap-stats .n")).map(
      (n) => n.textContent,
    );
    expect(stats).toEqual(["878", "8", "7 anos"]);

    // Liveline visible.
    expect(container.querySelector(".liveline.in")).not.toBe(null);
  });

  it("does not start the animation eagerly when motion is allowed", () => {
    // Flip the matchMedia mock to NOT reduce.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(matchMediaMock(false)),
    });

    // Provide a stub IntersectionObserver so the component doesn't
    // throw in jsdom (jsdom omits IO by default). vi.fn isn't a
    // constructor when its impl is an arrow, so use a real class.
    const observe = vi.fn();
    const disconnect = vi.fn();
    window.IntersectionObserver = class FakeIO {
      constructor() {}
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    } as unknown as typeof IntersectionObserver;

    const { container } = render(<ObservedTerminal />);

    // Typed command is empty and snapshot is hidden until IO fires.
    expect(container.querySelector(".snap.in")).toBe(null);
    expect(container.querySelector(".liveline.in")).toBe(null);
    expect(observe).toHaveBeenCalled();
  });
});
