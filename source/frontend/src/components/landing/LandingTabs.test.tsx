/**
 * LandingTabs — render, click, keyboard, hash sync, panel persistence.
 *
 * The component is heavily DOM-driven (hashchange listener, ARIA
 * attrs, focus moves). jsdom covers all of this, so no special mocks
 * beyond resetting window.location.hash between tests.
 */
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LandingTabs, TAB_IDS, type PanelId } from "./LandingTabs";

function fixturePanels(): Record<PanelId, React.ReactNode> {
  return {
    manifesto:   <div data-testid="content-manifesto">M</div>,
    daemon:      <div data-testid="content-daemon">D</div>,
    sessoes:     <div data-testid="content-sessoes">S</div>,
    verificacao: <div data-testid="content-verificacao">V</div>,
    compromisso: <div data-testid="content-compromisso">C</div>,
  };
}

function setHash(h: string) {
  // Use replaceState to avoid actually triggering a navigation in
  // jsdom and to mirror what the component does internally.
  const url = `${window.location.pathname}${window.location.search}${h}`;
  window.history.replaceState({}, "", url);
}

function dispatchHash() {
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("LandingTabs", () => {
  beforeEach(() => setHash(""));
  afterEach(() => setHash(""));

  it("renders 5 tabs in fixed order with ARIA semantics", () => {
    const { getAllByRole } = render(<LandingTabs panels={fixturePanels()} />);
    const tabs = getAllByRole("tab");
    expect(tabs.length).toBe(5);
    expect(tabs.map((t) => t.getAttribute("data-tab-id"))).toEqual(TAB_IDS);

    const tablist = getAllByRole("tablist");
    expect(tablist.length).toBe(1);
  });

  it("first tab is selected by default and others are hidden", () => {
    const { getAllByRole, getByTestId, queryByTestId } = render(
      <LandingTabs panels={fixturePanels()} />,
    );
    const tabs = getAllByRole("tab");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");

    // All 4 panels are mounted; only the active one is exposed.
    expect(getByTestId("content-manifesto")).toBeTruthy();
    const hiddenDaemonPanel = getByTestId("content-daemon").closest('[role="tabpanel"]') as HTMLElement | null;
    expect(hiddenDaemonPanel?.hasAttribute("hidden")).toBe(true);
    // Sanity: querying the hidden panel still finds it (always-mount).
    expect(queryByTestId("content-daemon")).toBeTruthy();
  });

  it("clicking a tab switches the active panel and updates ARIA", () => {
    const { getAllByRole, getByTestId } = render(<LandingTabs panels={fixturePanels()} />);
    const tabs = getAllByRole("tab");
    fireEvent.click(tabs[2]); // sessoes
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");
    expect(tabs[2].getAttribute("aria-selected")).toBe("true");
    const sessoesPanel = getByTestId("content-sessoes").closest('[role="tabpanel"]') as HTMLElement;
    const manifestoPanel = getByTestId("content-manifesto").closest('[role="tabpanel"]') as HTMLElement;
    expect(sessoesPanel.hasAttribute("hidden")).toBe(false);
    expect(manifestoPanel.hasAttribute("hidden")).toBe(true);
  });

  it("clicking a tab writes the hash and ArrowRight cycles tabs", () => {
    const { getAllByRole } = render(<LandingTabs panels={fixturePanels()} />);
    const tabs = getAllByRole("tab");

    fireEvent.click(tabs[1]); // daemon
    expect(window.location.hash).toBe("#daemon");

    tabs[1].focus();
    fireEvent.keyDown(tabs[1], { key: "ArrowRight" });
    expect(tabs[2].getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe("#sessoes");

    fireEvent.keyDown(tabs[2], { key: "End" });
    expect(tabs[4].getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe("#compromisso");

    fireEvent.keyDown(tabs[4], { key: "Home" });
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe("#manifesto");

    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(tabs[4].getAttribute("aria-selected")).toBe("true"); // wraps to compromisso
  });

  it("hydrates from location.hash on mount (compromisso)", () => {
    setHash("#compromisso");
    const { getAllByRole } = render(<LandingTabs panels={fixturePanels()} />);
    const tabs = getAllByRole("tab");
    expect(tabs[4].getAttribute("aria-selected")).toBe("true");
  });

  it("ignores garbage hashes (falls back to manifesto)", () => {
    setHash("#not-a-tab");
    const { getAllByRole } = render(<LandingTabs panels={fixturePanels()} />);
    const tabs = getAllByRole("tab");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  });

  it("listens for external hashchange events (browser back/forward)", () => {
    const { getAllByRole } = render(<LandingTabs panels={fixturePanels()} />);
    const tabs = getAllByRole("tab");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");

    act(() => {
      setHash("#daemon");
      dispatchHash();
    });
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  });

  it("internal panel state persists across tab switches (panels stay mounted)", () => {
    // Render a panel with an internal-state child (a <details>) and
    // check its `open` survives a round trip through another tab.
    const panels: Record<PanelId, React.ReactNode> = {
      manifesto: (
        <details data-testid="m-details">
          <summary>S</summary>
          <p>body</p>
        </details>
      ),
      daemon:      <div>D</div>,
      sessoes:     <div>S</div>,
      verificacao: <div>V</div>,
      compromisso: <div>C</div>,
    };
    const { getAllByRole, getByTestId } = render(<LandingTabs panels={panels} />);
    const details = getByTestId("m-details") as HTMLDetailsElement;
    details.open = true;
    expect(details.open).toBe(true);

    const tabs = getAllByRole("tab");
    fireEvent.click(tabs[1]);
    fireEvent.click(tabs[0]);

    // Same DOM node, still open.
    expect((getByTestId("m-details") as HTMLDetailsElement).open).toBe(true);
  });
});
