/**
 * FAQ — accordion that only ever has one open item at a time.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FAQ } from "./FAQ";

function getButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button.faq__q"));
}

function getItems(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLDivElement>(".faq__item"));
}

describe("FAQ", () => {
  it("renders 7 question items, all closed", () => {
    const { container } = render(<FAQ />);
    const buttons = getButtons(container);
    expect(buttons.length).toBe(7);
    buttons.forEach((b) => expect(b).toHaveAttribute("aria-expanded", "false"));
    getItems(container).forEach((it) => expect(it.getAttribute("open-state")).toBe("0"));
  });

  it("opens the clicked item and closes any previously open one", () => {
    const { container } = render(<FAQ />);
    const buttons = getButtons(container);
    const items = getItems(container);

    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
    expect(items[0].getAttribute("open-state")).toBe("1");

    fireEvent.click(buttons[2]);
    expect(buttons[2]).toHaveAttribute("aria-expanded", "true");
    expect(items[2].getAttribute("open-state")).toBe("1");
    // The previously open item closed.
    expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
    expect(items[0].getAttribute("open-state")).toBe("0");
  });

  it("clicking an open item closes it", () => {
    const { container } = render(<FAQ />);
    const buttons = getButtons(container);

    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(buttons[1]);
    buttons.forEach((b) => expect(b).toHaveAttribute("aria-expanded", "false"));
  });

  it("wires aria-controls to the answer panel id", () => {
    const { container } = render(<FAQ />);
    const buttons = getButtons(container);
    buttons.forEach((b) => {
      const id = b.getAttribute("aria-controls");
      expect(id).toBeTruthy();
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    });
  });
});
