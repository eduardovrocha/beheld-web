/**
 * LandingTabs — the 4-tab container that lives between the hero and
 * the CTA on the landing v5.
 *
 * Order is fixed: Manifesto · Daemon · Sessões · Verificação.
 *
 * Spec highlights:
 *   - Full ARIA tablist semantics (`role="tablist"`, `role="tab"`,
 *     `role="tabpanel"`, `aria-selected`, `aria-controls`, `id`).
 *   - Keyboard nav: ←/→ cycle tabs, Home/End jump to extremes,
 *     Enter/Space activate (focus already activates, so these are
 *     a noop in practice — but no-throw is the contract).
 *   - Hash sync: deep-linking via `#manifesto | #daemon | #sessoes |
 *     #verificacao`. Hash changes (from browser or from internal
 *     clicks) flip the active tab. On mount, if `location.hash`
 *     matches one of the four, that tab opens; otherwise default
 *     `manifesto`.
 *   - All four panels stay mounted (with `hidden` for inactives) so
 *     FAQ open-state and other internal state persists across tab
 *     switches.
 *   - On activation, every `.reveal` descendant of the freshly-active
 *     panel is forced to `.in` on the next frame, because they were
 *     `hidden`/no-layout and their IntersectionObserver never fired.
 *     The CSS transition delays (.d1..d4) keep the cascade.
 *   - Tab change scrolls the tablist into view smoothly (mockup
 *     behaviour). Under `prefers-reduced-motion`, scrolling is jump
 *     instead of smooth.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

export type PanelId = "manifesto" | "daemon" | "sessoes" | "verificacao";

export const TAB_IDS: PanelId[] = ["manifesto", "daemon", "sessoes", "verificacao"];

type TabSpec = {
  id: PanelId;
  numKey: TKey;
  labelKey: TKey;
};

const TABS: TabSpec[] = [
  { id: "manifesto",   numKey: "landing.tabs.num1", labelKey: "landing.tabs.manifesto" },
  { id: "daemon",      numKey: "landing.tabs.num2", labelKey: "landing.tabs.daemon" },
  { id: "sessoes",     numKey: "landing.tabs.num3", labelKey: "landing.tabs.sessoes" },
  { id: "verificacao", numKey: "landing.tabs.num4", labelKey: "landing.tabs.verificacao" },
];

export type LandingTabsProps = {
  panels: Record<PanelId, ReactNode>;
};

function readHashPanel(): PanelId {
  if (typeof window === "undefined") return "manifesto";
  const h = window.location.hash.replace("#", "");
  return (TAB_IDS as string[]).includes(h) ? (h as PanelId) : "manifesto";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function LandingTabs({ panels }: LandingTabsProps) {
  const t = useT();
  const uid = useId();
  const tablistRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Record<PanelId, HTMLDivElement | null>>({
    manifesto: null,
    daemon: null,
    sessoes: null,
    verificacao: null,
  });

  const [active, setActive] = useState<PanelId>(() => readHashPanel());

  // ── Hash sync (both ways) ─────────────────────────────────────────────
  useEffect(() => {
    function onHash() {
      const next = readHashPanel();
      setActive(next);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // ── On activation, force reveals inside the active panel ──────────────
  useEffect(() => {
    const node = panelRefs.current[active];
    if (!node) return;
    const reveals = node.querySelectorAll<HTMLElement>(".reveal");
    // Defer one frame so the panel is laid out before the transition
    // delay starts running.
    const raf = requestAnimationFrame(() => {
      reveals.forEach((el) => el.classList.add("in"));
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const activate = useCallback((next: PanelId, opts: { scroll?: boolean } = {}) => {
    setActive(next);
    // Update URL hash without scrolling (we control the scroll below).
    try {
      const url = `${window.location.pathname}${window.location.search}#${next}`;
      window.history.replaceState(window.history.state, "", url);
    } catch (_) {}
    if (opts.scroll !== false && tablistRef.current) {
      // Guard for environments that lack scrollIntoView (notably jsdom
      // in tests). Production browsers all implement it.
      const fn = tablistRef.current.scrollIntoView?.bind(tablistRef.current);
      if (typeof fn === "function") {
        fn({
          block: "start",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
    }
  }, []);

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const idx = TAB_IDS.indexOf(active);
    let nextIdx = idx;
    switch (e.key) {
      case "ArrowRight":
        nextIdx = (idx + 1) % TAB_IDS.length;
        break;
      case "ArrowLeft":
        nextIdx = (idx - 1 + TAB_IDS.length) % TAB_IDS.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = TAB_IDS.length - 1;
        break;
      case " ":
      case "Enter":
        // Already-focused tab — activation is automatic via focus, but
        // pressing Enter should be a safe no-throw confirmation.
        e.preventDefault();
        return;
      default:
        return;
    }
    e.preventDefault();
    const nextId = TAB_IDS[nextIdx];
    activate(nextId, { scroll: false });
    // Move focus to the newly-active tab button.
    const btn = tablistRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${nextId}"]`,
    );
    btn?.focus();
  }

  return (
    <div className="lp-tabs-root">
      <div
        ref={tablistRef}
        className="lp-tabs"
        role="tablist"
        aria-label={t("landing.tabs.aria")}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab-id={tab.id}
              id={`${uid}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? "lp-tab lp-tab--active" : "lp-tab"}
              onClick={() => activate(tab.id)}
              onKeyDown={onTabKeyDown}
            >
              <span className="lp-tab-num">{t(tab.numKey)}</span>{" "}
              <span className="lp-tab-label">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          ref={(el) => {
            panelRefs.current[tab.id] = el;
          }}
          role="tabpanel"
          id={`${uid}-panel-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="lp-panel"
          tabIndex={0}
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
