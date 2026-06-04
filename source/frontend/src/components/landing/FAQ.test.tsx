/**
 * FAQ — accordion that only ever has one open <details> at a time.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FAQ } from "./sections";

describe("FAQ", () => {
  it("renders 7 question items", () => {
    const { container } = render(<FAQ />);
    expect(container.querySelectorAll("details.qa").length).toBe(7);
  });

  it("opens the clicked item and closes any previously open one", () => {
    const { container } = render(<FAQ />);
    const items = Array.from(
      container.querySelectorAll<HTMLDetailsElement>("details.qa"),
    );

    // jsdom doesn't auto-toggle <details> on summary click — flip the
    // `open` prop directly and dispatch the toggle event to trigger
    // our handler, mirroring the real browser semantics.
    function openItem(idx: number) {
      items[idx].open = true;
      fireEvent(items[idx], new Event("toggle", { bubbles: false }));
    }

    openItem(0);
    expect(items[0].open).toBe(true);

    openItem(2);
    // After opening item 2, item 0 should have been closed by the handler.
    expect(items[2].open).toBe(true);
    expect(items[0].open).toBe(false);
  });

  it("closing an item does not auto-close peers", () => {
    const { container } = render(<FAQ />);
    const items = Array.from(
      container.querySelectorAll<HTMLDetailsElement>("details.qa"),
    );

    items[1].open = true;
    fireEvent(items[1], new Event("toggle", { bubbles: false }));
    expect(items[1].open).toBe(true);

    // Now close item 1 (open=false). Handler should NOT do anything.
    items[1].open = false;
    fireEvent(items[1], new Event("toggle", { bubbles: false }));
    items.forEach((it) => expect(it.open).toBe(false));
  });
});
