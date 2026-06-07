/**
 * LandingV2 — smoke render da long-scroll page (kit landing-v2-integration).
 *
 * Asserts the narrative skeleton is wired: nav anchors → section ids,
 * the four hero variants (A→B→C→D) + dots, the numbered sections (01–07
 * + the dotted why-install beat), both install boxes, FAQ items and the
 * footer. MachineCounter's fetch is stubbed to fail, so the counter row
 * is absent (its behaviour is covered in its own test).
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LandingV2 } from "./index";

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

describe("LandingV2 (kit landing-v2-integration)", () => {
  it("renders the four hero variants with variant A active", () => {
    const { container } = render(<LandingV2 />);

    const variants = container.querySelectorAll(".hero__variant");
    expect(variants.length).toBe(4);
    expect(container.querySelector(".hero__variant.is-active")?.getAttribute("data-variant")).toBe("a");

    // Markup inline do copy: <sig> vira span.sig dentro do h1 ativo.
    expect(container.querySelector(".hero__variant.is-active .hero__h .sig")).not.toBeNull();
  });

  it("jumps to a variant when its dot is clicked", () => {
    const { container } = render(<LandingV2 />);

    const dotC = container.querySelector('.hero__dot[data-target="c"]')!;
    fireEvent.click(dotC);

    expect(container.querySelector(".hero__variant.is-active")?.getAttribute("data-variant")).toBe("c");
    expect(dotC.classList.contains("is-active")).toBe(true);
  });

  it("has a matching section id for every nav anchor", () => {
    const { container } = render(<LandingV2 />);
    for (const id of ["top", "manifesto", "B3H31D", "sessoes", "verificacao", "por-que-hoje"]) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("renders the company menu in the nav actions cluster (translated trigger)", () => {
    const { container } = render(<LandingV2 />);
    const trigger = container.querySelector(".nav__actions .dd .dd__t");
    expect(trigger?.textContent).toContain("Para empresas");
    // itens do dropdown apontam para as rotas reais de empresa
    expect(container.querySelector('.dd__menu a[href="/empresa/entrar"]')).not.toBeNull();
    expect(container.querySelector('.dd__menu a[href="/empresa/cadastro"]')).not.toBeNull();
  });

  it("renders the language menu with the active locale checked", () => {
    const { container } = render(<LandingV2 />);
    const active = container.querySelector(".dd--lang .dd__item--lang.is-active");
    // provider de fallback resolve em pt → PT ativo
    expect(active?.querySelector(".dd__code")?.textContent).toBe("PT");
  });

  it("renders the numbered eyebrows in order (01–07 + dotted beat)", () => {
    const { container } = render(<LandingV2 />);
    const idxs = Array.from(container.querySelectorAll(".eyebrow .idx")).map(
      (el) => el.textContent,
    );
    expect(idxs).toEqual(["01", "·", "02", "03", "04", "05", "06", "07"]);
  });

  it("renders two install boxes (hero + CTA) and seven FAQ items", () => {
    const { container } = render(<LandingV2 />);
    expect(container.querySelectorAll(".install").length).toBe(2);
    expect(container.querySelectorAll(".faq__item").length).toBe(7);
  });

  it("opens one FAQ at a time", () => {
    const { container } = render(<LandingV2 />);
    const [q1, q2] = Array.from(container.querySelectorAll<HTMLButtonElement>(".faq__q"));

    fireEvent.click(q1);
    expect(q1.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(q2);
    expect(q1.getAttribute("aria-expanded")).toBe("false");
    expect(q2.getAttribute("aria-expanded")).toBe("true");
  });

  it("toggles the landing-v2-kit-page html class on mount/unmount", () => {
    const { unmount } = render(<LandingV2 />);
    expect(document.documentElement.classList.contains("landing-v2-kit-page")).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains("landing-v2-kit-page")).toBe(false);
  });

  it("renders the triangle band with the Beheld row highlighted", () => {
    const { container } = render(<LandingV2 />);
    const lines = container.querySelectorAll(".triangle__line");
    expect(lines.length).toBe(3);
    expect(lines[2].classList.contains("triangle__line--us")).toBe(true);
    expect(lines[2].querySelector(".triangle__brand")?.textContent).toBe("Beheld");
  });

  it("renders the footer brand + tagline", () => {
    const { container } = render(<LandingV2 />);
    expect(container.querySelector(".site-foot .fm--tag")?.textContent).toBe(
      "beheld.dev, Prova contínua de prática técnica.",
    );
  });
});
