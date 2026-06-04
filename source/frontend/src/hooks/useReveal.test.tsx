/**
 * useReveal / useRevealMany — under prefers-reduced-motion, both must
 * add the `.in` class synchronously and skip creating an
 * IntersectionObserver.
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReveal, useRevealMany } from "./useReveal";

function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("prefers-reduced-motion") ? reduce : false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })),
  });
}

let ioCtor: ReturnType<typeof vi.fn> | null = null;

describe("useReveal", () => {
  let originalIO: typeof window.IntersectionObserver;

  beforeEach(() => {
    originalIO = window.IntersectionObserver;
    ioCtor = vi.fn();
    // @ts-expect-error — stub: class with no-op methods. We track
    // construction via ioCtor and the spy.
    window.IntersectionObserver = class FakeIO {
      constructor(...args: unknown[]) { ioCtor!(...args); }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    } as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    window.IntersectionObserver = originalIO;
    vi.restoreAllMocks();
  });

  function Probe() {
    const ref = useReveal<HTMLDivElement>();
    return <div data-testid="probe" ref={ref} className="reveal" />;
  }

  it("adds `in` immediately under reduced motion (no IO)", () => {
    setReducedMotion(true);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").classList.contains("in")).toBe(true);
    expect(ioCtor).not.toHaveBeenCalled();
  });

  it("creates an IntersectionObserver when motion is allowed", () => {
    setReducedMotion(false);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").classList.contains("in")).toBe(false);
    expect(ioCtor).toHaveBeenCalled();
  });
});

describe("useRevealMany", () => {
  let originalIO: typeof window.IntersectionObserver;

  beforeEach(() => {
    originalIO = window.IntersectionObserver;
    ioCtor = vi.fn();
    // @ts-expect-error — stub: class with no-op methods. We track
    // construction via ioCtor and the spy.
    window.IntersectionObserver = class FakeIO {
      constructor(...args: unknown[]) { ioCtor!(...args); }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    } as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    window.IntersectionObserver = originalIO;
    vi.restoreAllMocks();
  });

  function Probe() {
    const ref = useRevealMany<HTMLDivElement>(".reveal");
    return (
      <div ref={ref}>
        <span className="reveal" data-testid="a" />
        <span className="reveal" data-testid="b" />
        <span className="reveal" data-testid="c" />
      </div>
    );
  }

  it("adds `in` to every matching child under reduced motion", () => {
    setReducedMotion(true);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("a").classList.contains("in")).toBe(true);
    expect(getByTestId("b").classList.contains("in")).toBe(true);
    expect(getByTestId("c").classList.contains("in")).toBe(true);
    expect(ioCtor).not.toHaveBeenCalled();
  });
});
