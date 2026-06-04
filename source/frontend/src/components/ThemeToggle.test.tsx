/**
 * ThemeToggle — cycle dark ↔ github, persist in localStorage, no flash.
 *
 * The component reads the persisted mode on mount and applies it to
 * the DOM. Clicking flips the mode, writes the new value, and updates
 * both the html.dark class and the data-theme attribute.
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "./ThemeToggle";

const STORAGE_KEY = "dp-theme";

function resetDOM() {
  const root = document.documentElement;
  root.classList.remove("dark");
  root.removeAttribute("data-theme");
  localStorage.removeItem(STORAGE_KEY);
}

describe("ThemeToggle", () => {
  beforeEach(() => resetDOM());
  afterEach(() => resetDOM());

  it("defaults to dark when nothing is persisted (mockup behaviour)", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe(null);
  });

  it("hydrates to github when localStorage says github", () => {
    localStorage.setItem(STORAGE_KEY, "github");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("github");
  });

  it("clicking dark→github flips the DOM and persists", () => {
    const { getByRole } = render(<ThemeToggle />);
    fireEvent.click(getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("github");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("github");
  });

  it("clicking github→dark flips back and persists", () => {
    localStorage.setItem(STORAGE_KEY, "github");
    const { getByRole } = render(<ThemeToggle />);
    fireEvent.click(getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe(null);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("dispatches a `themechange` event on flip (for Constellation)", () => {
    let heard = false;
    const handler = () => { heard = true; };
    document.addEventListener("themechange", handler);

    const { getByRole } = render(<ThemeToggle />);
    fireEvent.click(getByRole("button"));

    document.removeEventListener("themechange", handler);
    expect(heard).toBe(true);
  });
});
