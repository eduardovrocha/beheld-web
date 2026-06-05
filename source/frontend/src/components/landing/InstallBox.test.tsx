/**
 * InstallBox — the copy button writes the command to the clipboard,
 * swaps its label to "copiado ✓" + .copied for ~1.6s, then resets.
 */
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InstallBox } from "./InstallBox";

describe("InstallBox", () => {
  it("renders the default install command with a $ prompt", () => {
    const { container } = render(<InstallBox />);
    expect(container.querySelector("code")?.textContent).toBe(
      "curl -fsSL beheld.dev/install.sh | sh",
    );
    expect(container.querySelector(".pmt")?.textContent).toBe("$");
  });

  it("accepts a custom command", () => {
    const { container } = render(<InstallBox command="brew install beheld" />);
    expect(container.querySelector("code")?.textContent).toBe("brew install beheld");
  });

  it("copies the command and shows the copied state, then resets", async () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      const { getByRole } = render(<InstallBox command="cmd-A" />);
      const button = getByRole("button");

      fireEvent.click(button);
      // Flush the clipboard promise (fake timers don't block microtasks).
      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("cmd-A"));
      await vi.waitFor(() => expect(button.textContent).toBe("copiado ✓"));
      expect(button.classList.contains("copied")).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(button.textContent).toBe("copiar");
      expect(button.classList.contains("copied")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not throw if the clipboard API is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { getByRole } = render(<InstallBox />);
    fireEvent.click(getByRole("button"));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    // No state change on failure — label stays "copiar".
    expect(getByRole("button").textContent).toBe("copiar");
  });
});
