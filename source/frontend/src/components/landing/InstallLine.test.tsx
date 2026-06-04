/**
 * InstallLine — copy button writes the command to the clipboard and
 * swaps the icon to a checkmark for ~1.4s.
 */
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InstallLine } from "./InstallLine";

describe("InstallLine", () => {
  it("renders the default install command with a $ prompt", () => {
    const { container } = render(<InstallLine />);
    const cmd = container.querySelector(".cmd")?.textContent;
    expect(cmd).toBe("curl -fsSL beheld.dev/install.sh | sh");
    expect(container.querySelector(".pr")?.textContent).toBe("$");
  });

  it("accepts a custom command", () => {
    const { container } = render(<InstallLine command="brew install beheld" />);
    expect(container.querySelector(".cmd")?.textContent).toBe(
      "brew install beheld",
    );
  });

  it("writes the command to the clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { getByRole } = render(<InstallLine command="cmd-A" />);
    fireEvent.click(getByRole("button"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("cmd-A"));
  });

  it("does not throw if the clipboard API is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { getByRole } = render(<InstallLine />);
    fireEvent.click(getByRole("button"));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    // No assertion errors thrown means the component handled rejection.
  });
});
