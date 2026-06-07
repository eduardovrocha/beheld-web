/**
 * ShellThemeToggle — alternância dark ↔ light do app shell.
 * Verifica o contrato do design_handoff_temas: default dark (sem
 * atributo), clique liga html[data-theme-v2="light"] + persiste em
 * localStorage["beheld:theme"], segundo clique volta pro dark.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ShellThemeToggle } from "./ShellThemeToggle";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme-v2");
  localStorage.removeItem("beheld:theme");
});

describe("ShellThemeToggle", () => {
  it("starts dark (no attribute) and shows both glyphs for CSS selection", () => {
    const { container } = render(<ShellThemeToggle />);
    expect(document.documentElement.getAttribute("data-theme-v2")).toBeNull();
    expect(container.querySelector(".theme-toggle .moon")).not.toBeNull();
    expect(container.querySelector(".theme-toggle .sun")).not.toBeNull();
  });

  it("toggles to light: sets the html attribute and persists the choice", async () => {
    const user = userEvent.setup();
    render(<ShellThemeToggle />);

    await user.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme-v2")).toBe("light");
    expect(localStorage.getItem("beheld:theme")).toBe("light");
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles back to dark: removes the attribute and persists 'dark'", async () => {
    const user = userEvent.setup();
    render(<ShellThemeToggle />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme-v2")).toBeNull();
    expect(localStorage.getItem("beheld:theme")).toBe("dark");
  });

  it("initialises from a pre-paint applied attribute", () => {
    document.documentElement.setAttribute("data-theme-v2", "light");
    render(<ShellThemeToggle />);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });
});
