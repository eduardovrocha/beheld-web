/**
 * FAQ — one-at-a-time accordion, 2-col grid (stacks under 820px).
 *
 * Each item is a <button class="faq__q"> + a .faq__a panel animated via
 * max-height 0 ↔ scrollHeight (300ms ease, per the design handoff).
 * The reference's `open-state` attribute is kept (it drives the `+`
 * → `×` rotation in CSS) and production a11y is layered on top:
 * aria-expanded + aria-controls on the button, region role on the
 * panel.
 */
import { useLayoutEffect, useRef, useState } from "react";

import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

export const FAQ_IDS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;
export type FaqId = (typeof FAQ_IDS)[number];

export function FAQ() {
  const t = useT();
  const [open, setOpen] = useState<FaqId | null>(null);
  const panelRefs = useRef(new Map<FaqId, HTMLDivElement>());

  // Animate max-height after the open item changes. scrollHeight is
  // only known post-render, so this runs in a layout effect instead of
  // being computed inline.
  useLayoutEffect(() => {
    panelRefs.current.forEach((el, id) => {
      el.style.maxHeight = id === open ? `${el.scrollHeight}px` : "0px";
    });
  }, [open]);

  return (
    <div className="faq cols2 reveal">
      {FAQ_IDS.map((id) => {
        const isOpen = id === open;
        return (
          <div key={id} className="faq__item" open-state={isOpen ? "1" : "0"}>
            <button
              className="faq__q"
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-a-${id}`}
              onClick={() => setOpen((prev) => (prev === id ? null : id))}
            >
              {t(`landing.faq.${id}` as TKey)}
              <span className="faq__sign">+</span>
            </button>
            <div
              id={`faq-a-${id}`}
              role="region"
              className="faq__a"
              ref={(el) => {
                if (el) panelRefs.current.set(id, el);
                else panelRefs.current.delete(id);
              }}
            >
              <div>
                <span className="pin">→</span> {t(`landing.faq.a${id.slice(1)}` as TKey)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
